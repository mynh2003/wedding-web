import assert from "node:assert/strict";
import test from "node:test";
import { loader } from "./helpers/load-ts.mjs";

const assetId="11111111-1111-1111-1111-111111111111";
const weddingId="22222222-2222-2222-2222-222222222222";
function handler({authorized=true,trusted=true,claimError=null,removeError=null,completeError=null,path=`${weddingId}/photo.webp`}={}) {
  const calls=[];
  const client={rpc:async(name,args)=>{calls.push([name,args]);return name==="begin_media_deletion"?{data:path,error:claimError}:{data:!completeError,error:completeError};},storage:{from:()=>({remove:async paths=>{calls.push(["remove",paths]);return{error:removeError};}})}};
  const route=loader({}, {"@/lib/auth/admin":{getAdmin:async()=>authorized?{admin:{wedding_id:weddingId},supabase:client}:null},"@/lib/auth/origin":{hasTrustedOrigin:()=>trusted},"next/cache":{revalidatePath:()=>{}}})("app/api/admin/media/[id]/route.ts");
  const send=(body={confirmed:true})=>route.DELETE(new Request("https://admin.example/api/admin/media/test",{method:"DELETE",body:JSON.stringify(body)}),{params:Promise.resolve({id:assetId})});
  return{send,calls};
}

test("permanent deletion requires admin, trusted origin and explicit confirmation",async()=>{
  for(const [options,status] of [[{authorized:false},401],[{trusted:false},403]]){const check=handler(options);assert.equal((await check.send()).status,status);assert.equal(check.calls.length,0);}
  const check=handler();assert.equal((await check.send({})).status,400);assert.equal(check.calls.length,0);
});
test("a referenced image is rejected before any Storage call",async()=>{
  const check=handler({claimError:{code:"23514"}});assert.equal((await check.send()).status,409);assert.deepEqual(check.calls.map(c=>c[0]),["begin_media_deletion"]);
});
test("Storage failure retains metadata and completion failure remains retryable",async()=>{
  const storage=handler({removeError:{message:"failed"}});assert.equal((await storage.send()).status,502);assert.deepEqual(storage.calls.map(c=>c[0]),["begin_media_deletion","remove"]);
  const completion=handler({completeError:{code:"23514"}});assert.equal((await completion.send()).status,503);assert.equal(completion.calls.length,3);
  const wrongWedding=handler({path:"other-wedding/file.webp"});assert.equal((await wrongWedding.send()).status,500);assert.equal(wrongWedding.calls.length,1);
});
test("successful deletion removes Storage first and completes metadata last",async()=>{
  const check=handler();const response=await check.send();assert.equal(response.status,200);assert.deepEqual(check.calls.map(c=>c[0]),["begin_media_deletion","remove","complete_media_deletion"]);assert.equal(response.headers.get("cache-control"),"private, no-store");
});
test("usage checks include unpublished content, id arrays and legacy encoded URLs",()=>{
  const {mediaUsage}=loader()("lib/media/usage.ts");const asset={id:assetId,storage_path:`${weddingId}/photo.webp`};
  assert.deepEqual(Array.from(mediaUsage(asset,[{section_key:"hero",content:{cover_media_id:assetId}},{section_key:"draft",content:{photos:[assetId]}},{section_key:"legacy",content:{url:`https://storage.example/${encodeURIComponent(asset.storage_path)}`}},{section_key:"unrelated",content:{}}])),["hero","draft","legacy"]);
});
