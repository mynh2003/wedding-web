import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(file, dependencies = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, process, console, require: (name) => dependencies[name] ?? (name === "@/lib/security/rate-limit" ? { limitRequest: async () => null, requestFingerprint: () => "b".repeat(64) } : name === "@/lib/supabase/privileged" ? { createWriteClient: dependencies["@/lib/supabase/public-server"].createPublicClient } : require(name)) });
  return exports;
}
const validation = load("lib/validation/wish.ts");
const token = "a".repeat(64);
const base = { authorName: "Khách mời", message: "Chúc hạnh phúc!" };

test("personal RSVP requires a valid token and explicit attendance", () => {
  for (const attendance of ["attending", "not-attending"]) {
    const result = validation.parseWishInput({ ...base, invitationToken: token, attendance });
    assert.equal(result.value.attendance, attendance);
    assert.equal(result.value.invitationToken, token);
  }
  for (const input of [
    { invitationToken: token },
    { invitationToken: "invalid", attendance: "attending" },
    { invitationToken: token, attendance: "unconfirmed" },
    { invitationToken: token, attendance: null },
  ]) assert.ok("error" in validation.parseWishInput({ ...base, ...input }));
  assert.ok("value" in validation.parseWishInput(base));
});

test("API uses hashed link identity and latest values without falling back on revoked links", async () => {
  const calls = [];
  let rpcError = null;
  const { POST } = load("app/api/wishes/route.ts", {
    "@/lib/validation/wish": validation,
    "@/lib/http/body": { readJson: async (request) => ({ value: await request.json() }) },
    "@/lib/invitations/token": { hashInvitationToken: (value) => createHash("sha256").update(value).digest("hex") },
    "@/lib/supabase/public-server": { createPublicClient: () => ({ rpc: async (name, args) => { calls.push({ name, args }); return { error: rpcError }; } }) },
    "@/lib/supabase/server": { createClient: () => { throw new Error("Public RSVP must not read administrator cookies"); } },
  });
  const send = (body) => POST(new Request("http://localhost/api/wishes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
  assert.equal((await send({ ...base, invitationToken: token, attendance: "attending", side: "bride" })).status, 202);
  assert.equal((await send({ ...base, message: "Lời chúc mới", invitationToken: token, attendance: "not-attending" })).status, 202);
  assert.equal(calls[0].name, "submit_invitation_response");
  assert.equal(calls[1].args.input_token_hash, createHash("sha256").update(token).digest("hex"));
  assert.equal(calls[1].args.input_message, "Lời chúc mới");
  assert.equal(calls[1].args.input_attendance, "not-attending");
  assert.equal(calls[0].args.input_side, undefined);
  rpcError = { message: "invitation unavailable" };
  assert.equal((await send({ ...base, invitationToken: token, attendance: "attending" })).status, 400);
  assert.equal(calls.length, 3);
  assert.equal(calls[2].name, "submit_invitation_response");
  rpcError = null;
  assert.equal((await send(base)).status, 202);
  assert.equal(calls[3].name, "submit_public_wish");
  assert.equal((await send({ ...base, invitationToken: token })).status, 400);
  assert.equal(calls.length, 4);
});

test("public wishes use one submission RPC with the chosen side and supplied private fingerprint", async () => {
  const calls = [];
  let rpcError = null;
  const { POST } = load("app/api/wishes/route.ts", {
    "@/lib/validation/wish": validation,
    "@/lib/http/body": { readJson: async (request) => ({ value: await request.json() }) },
    "@/lib/invitations/token": {},
    "@/lib/supabase/public-server": { createPublicClient: () => ({ rpc: async (name, args) => { calls.push({ name, args }); return { error: rpcError }; } }) },
    "@/lib/supabase/server": { createClient: () => { throw new Error("Public wishes must not read administrator cookies"); } },
  });
  const send = (side) => POST(new Request("http://localhost/api/wishes", {
    method: "POST", headers: { "x-forwarded-for": "192.168.1.10, 10.0.0.1" }, body: JSON.stringify({ ...base, side }),
  }));
  const first = await send("bride");
  assert.equal(first.status, 202);
  assert.equal(first.headers.get("cache-control"), "no-store");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, "submit_public_wish");
  assert.equal(calls[0].args.input_side, "bride");
  assert.equal(calls[0].args.input_fingerprint, "b".repeat(64));

  rpcError = { message: "wish rate limited" };
  const limited = await send("groom");
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "600");
  assert.equal(limited.headers.get("cache-control"), "no-store");
  assert.equal(calls.length, 2);
  assert.equal(calls[1].args.input_fingerprint, calls[0].args.input_fingerprint);
  assert.equal(calls[1].args.input_side, "groom");
  assert.deepEqual(await limited.json(), { error: "Bạn đã gửi quá nhiều lời chúc. Vui lòng thử lại sau." });
});

test("migration locks the guest and keeps one moderated wish per guest", () => {
  const sql = fs.readFileSync("supabase/migrations/202610180008_guest_attendance.sql", "utf8");
  assert.match(sql, /default 'unconfirmed'/);
  assert.match(sql, /il\.revoked_at is null/);
  assert.match(sql, /g\.wedding_id = il\.wedding_id/);
  assert.match(sql, /for update of g, il/);
  assert.match(sql, /create unique index wishes_one_per_guest/);
  assert.match(sql, /on conflict \(guest_id\) where guest_id is not null do update/);
  assert.match(sql, /status = 'pending', reviewed_at = null/);
  assert.match(sql, /current_count >= 5/);
  assert.match(sql, /revoke all on function public\.submit_invitation_response/);
  assert.match(sql, /begin;[\s\S]*update public\.guests[\s\S]*insert into public\.wishes[\s\S]*commit;/);
});
