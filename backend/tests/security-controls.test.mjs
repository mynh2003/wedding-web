import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import sharp from "sharp";
import { loader } from "./helpers/load-ts.mjs";

test("body reader rejects declared and chunked oversized payloads before buffering the rest", async () => {
  const { readBytes, readJson } = loader()("lib/http/body.ts");
  let pulled = 0, cancelled = false;
  const stream = new ReadableStream({ pull(controller) { pulled++; controller.enqueue(new Uint8Array(8)); }, cancel() { cancelled = true; } });
  const response = await readBytes(new Request("https://test.example", { method: "POST", body: stream, duplex: "half" }), 10);
  assert.match(response.error, /large/);
  assert.ok(cancelled);
  assert.ok(pulled <= 3);
  const declared = new Request("https://test.example", { method: "POST", headers: { "content-length": "99999" }, body: "{}" });
  assert.match((await readJson(declared)).error, /large/);
  assert.equal(declared.bodyUsed, false);
  assert.match((await readJson(new Request("https://test.example", { method: "POST", body: "{bad" }))).error, /JSON/);
});

test("untrusted forwarded IPs do not bypass limits; trusted proxy identity and account keys are private", async () => {
  const local = loader({ NODE_ENV: "development" })("lib/security/rate-limit.ts");
  const request = ip => new Request("https://test.example", { headers: { "x-forwarded-for": ip } });
  assert.equal(local.requestFingerprint(request("1.1.1.1")), local.requestFingerprint(request("2.2.2.2")));
  for (let i=0;i<5;i++) assert.equal(await local.limitRequest(request("1.1.1.1"), "wish"), null);
  const denied = await local.limitRequest(request("2.2.2.2"), "wish");
  assert.equal(denied.status, 429);
  assert.ok(Number(denied.headers.get("retry-after")) > 0);
  assert.equal(local.consumeLocalLimit("wish", "expires", 0), 0);
  for(let i=0;i<4;i++) local.consumeLocalLimit("wish", "expires", 0);
  assert.ok(local.consumeLocalLimit("wish", "expires", 0) > 0);
  assert.equal(local.consumeLocalLimit("wish", "expires", 600001), 0);
  const proxy = loader({ NODE_ENV: "development", VERCEL: "1" })("lib/security/rate-limit.ts");
  assert.notEqual(proxy.requestFingerprint(request("1.1.1.1")), proxy.requestFingerprint(request("2.2.2.2")));
  assert.equal(proxy.requestFingerprint(request("1.1.1.1"), " ADMIN@example.com "), proxy.requestFingerprint(request("2.2.2.2"), "admin@example.com"));
});

test("production rate limiting fails closed and durable RPC decisions apply across requests", async () => {
  const request = new Request("https://test.example");
  const missing = loader({ NODE_ENV: "production" })("lib/security/rate-limit.ts");
  assert.equal((await missing.limitRequest(request, "wish")).status, 503);
  const calls=[];
  const env={ NODE_ENV: "production", WISH_RATE_LIMIT_SECRET: "a".repeat(64), SUPABASE_SECRET_KEY: "test-server-key" };
  const limiter=loader(env,{ "@/lib/supabase/privileged": { createWriteClient: () => ({ rpc: async (...args) => { calls.push(args);return {data:7,error:null};} }) } })("lib/security/rate-limit.ts");
  const response=await limiter.limitRequest(request,"login-account","admin@example.com");
  assert.equal(response.status,429);assert.equal(response.headers.get("retry-after"),"7");
  assert.equal(calls[0][0],"consume_request_limit");
  assert.match(calls[0][1].input_subject,/^[a-f0-9]{64}$/);
  assert.ok(!JSON.stringify(calls).includes("admin@example.com"));
});

test("throttled wishes never construct a submission client or hit a database write", async () => {
  let writes=0;
  const route=loader({}, {
    "@/lib/security/rate-limit": { limitRequest: async () => new Response("limited",{status:429}) },
    "@/lib/supabase/privileged": { createWriteClient() { writes++;throw Error("Must not write"); } },
  })("app/api/wishes/route.ts");
  const response=await route.POST(new Request("https://test.example/api/wishes",{method:"POST",body:JSON.stringify({authorName:"Khách",message:"Chúc hạnh phúc"})}));
  assert.equal(response.status,429);assert.equal(writes,0);
});

test("uploaded PNGs keep pixels and alpha in lossless WebP while metadata is removed; corrupt images fail", async () => {
  const optimize=loader()("lib/media/optimize-image.ts").optimizeUploadedImage;
  const png=await sharp({create:{width:20,height:30,channels:4,background:{r:120,g:20,b:30,alpha:0.5}}}).png().withMetadata().toBuffer();
  const output=await optimize(png,"image/png");
  const metadata=await sharp(output).metadata();
  assert.equal(metadata.format,"webp");assert.equal(metadata.width,20);assert.equal(metadata.height,30);assert.equal(metadata.hasAlpha,true);assert.equal(metadata.exif,undefined);
  assert.deepEqual(await sharp(output).raw().toBuffer(),await sharp(png).raw().toBuffer());
  await assert.rejects(optimize(Buffer.from("corrupt"),"image/jpeg"));
  const jpeg=await sharp({create:{width:3000,height:1000,channels:3,background:"#722f37"}}).jpeg().withMetadata({orientation:6}).toBuffer();
  const normalized=await sharp(await optimize(jpeg,"image/jpeg")).metadata();
  assert.equal(normalized.width,853);assert.equal(normalized.height,2560);assert.equal(normalized.orientation,undefined);
});

test("login does not distinguish unconfirmed, unauthorized and invalid accounts or call auth when throttled", async () => {
  const env={NODE_ENV:"production",APP_ROLE:"backend",NEXT_PUBLIC_API_URL:"https://admin.example",NEXT_PUBLIC_SITE_URL:"https://invite.example"};
  let authCalls=0;
  const request=()=>{const r=new Request("https://admin.example/auth/login",{method:"POST",headers:{origin:"https://admin.example","content-type":"application/x-www-form-urlencoded"},body:"email=admin%40example.com&password=test"});Object.defineProperty(r,"nextUrl",{value:new URL(r.url)});return r;};
  const loadCase=(confirmed,admin,denied=false)=>loader(env,{
    "@/lib/security/rate-limit":{limitRequest:async()=>denied?new Response(null,{status:429}):null},
    "@/lib/supabase/server":{createClient:async()=>({auth:{signInWithPassword:async()=>{authCalls++;return{error:null};},getUser:async()=>({data:{user:{id:"account",email_confirmed_at:confirmed?"yes":null}}}),signOut:async()=>{}},from:()=>({select(){return this;},eq(){return this;},maybeSingle:async()=>({data:admin?{user_id:"account"}:null})})})},
  })("app/auth/login/route.ts");
  for(const [confirmed,admin] of [[false,false],[true,false]])assert.equal((await loadCase(confirmed,admin).POST(request())).headers.get("location"),"https://admin.example/admin/login?error=invalid");
  const before=authCalls;assert.match((await loadCase(true,true,true).POST(request())).headers.get("location"),/error=limited$/);assert.equal(authCalls,before);
});

test("already optimized WebP retains exact decoded pixels and removes EXIF without size inflation", async () => {
  const optimize=loader()("lib/media/optimize-image.ts").optimizeUploadedImage;
  const webp=await sharp({create:{width:60,height:30,channels:4,background:{r:125,g:12,b:32,alpha:0.6}}}).webp({quality:65}).withMetadata().toBuffer();
  const cleaned=await optimize(webp,"image/webp");
  assert.ok(cleaned.length<=webp.length);
  assert.deepEqual(await sharp(cleaned).raw().toBuffer(),await sharp(webp).raw().toBuffer());
  assert.equal((await sharp(cleaned).metadata()).exif,undefined);
  const malformed=Buffer.from(webp);malformed.writeUInt32LE(webp.length+100,4);
  await assert.rejects(optimize(malformed,"image/webp"));
});

test("editor authenticates once, scopes all reads and signs unique previews in one batch", async () => {
  let authCalls=0;
  const calls=[];
  const rows={wedding_content:[{section_key:"hero",content:{cover_media_id:"11111111-1111-1111-1111-111111111111"}}],weddings:{groom_name:"Minh",bride_name:"Huệ",wedding_date:"2026-10-22"},media_assets:[{id:"11111111-1111-1111-1111-111111111111",storage_path:"photo",mime_type:"image/webp"},{id:"two",storage_path:"photo",mime_type:"image/webp"}]};
  const client={from(table){const q={select(){return q;},eq(key,value){calls.push([table,key,value]);return q;},in:async()=>({data:rows[table],error:null}),order:async()=>({data:rows[table],error:null}),single:async()=>({data:rows[table],error:null})};return q;},storage:{from(){return{createSignedUrls:async(paths)=>{calls.push(["sign",Array.from(paths)]);return{data:paths.map(path=>({path,signedUrl:"https://storage.example/photo"}))};}};}}};
  const route=loader({}, {"@/lib/auth/admin":{getAdmin:async()=>{authCalls++;return{admin:{wedding_id:"wedding-a"},supabase:client};}}})("app/api/admin/editor/route.ts");
  const response=await route.GET();assert.equal(response.status,200);assert.equal(authCalls,1);assert.equal((await response.json()).media.length,2);
  assert.equal(calls.filter(c=>c[0]==="sign").length,1);assert.deepEqual(calls.find(c=>c[0]==="sign")[1],["photo"]);
  assert.deepEqual(calls.filter(c=>c[0]!=="sign").map(c=>c[2]),["wedding-a","wedding-a","wedding-a"]);
});

test("migration removes anonymous write bypasses and grants the limiter only to backend role", () => {
  const sql=fs.readFileSync("supabase/migrations/202610220001_backend_abuse_controls.sql","utf8");
  assert.match(sql,/revoke all on function public.submit_public_wish[\s\S]*?from public, anon, authenticated/);
  assert.match(sql,/revoke all on function public.submit_invitation_response[\s\S]*?from public, anon, authenticated/);
  assert.match(sql,/revoke all on function public.consume_request_limit[\s\S]*?from public, anon, authenticated/);
  assert.match(sql,/on conflict \(scope, subject\) do update/);
  assert.match(sql,/revoke select on public.wishes from anon/);
});
