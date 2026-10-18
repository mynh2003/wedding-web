import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { NextRequest, NextResponse } = require("next/server");
function load(file, env = {}, dependencies = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, Buffer, process: { env }, require: (name) => name === "server-only" ? {} : dependencies[name] ?? require(name) });
  return exports;
}
const tokens = load("lib/invitations/token.ts");
const key = "a1".repeat(32);
function storage(secret = key) { return load("lib/invitations/storage.ts", { INVITATION_LINK_ENCRYPTION_KEY: secret }, { "./token": tokens }); }
const crypto = storage();
const weddingId = "wedding-a", guestId = "guest-a";
const raw = tokens.createInvitationToken().rawToken;
const encrypted = crypto.encryptInvitationToken(raw, weddingId, guestId);

test("saved links encrypt and reopen the identical token, without storing plaintext", () => {
  assert.equal(crypto.decryptInvitationToken(encrypted, weddingId, guestId), raw);
  assert.ok(!encrypted.includes(raw));
  assert.notEqual(encrypted, crypto.encryptInvitationToken(raw, weddingId, guestId));
});
test("encrypted links reject tampering, wrong keys and guest/wedding substitution", () => {
  const parts = encrypted.split("."); parts[3] = (parts[3][0] === "0" ? "1" : "0") + parts[3].slice(1);
  assert.throws(() => crypto.decryptInvitationToken(parts.join("."), weddingId, guestId));
  assert.throws(() => storage("b2".repeat(32)).decryptInvitationToken(encrypted, weddingId, guestId));
  assert.throws(() => crypto.decryptInvitationToken(encrypted, "wedding-b", guestId));
  assert.throws(() => crypto.decryptInvitationToken(encrypted, weddingId, "guest-b"));
  assert.throws(() => crypto.decryptInvitationToken("invalid", weddingId, guestId));
});
test("missing or malformed encryption keys fail closed", () => {
  for (const secret of [undefined, "", "replace-me", "a".repeat(63)]) assert.throws(() => storage(secret === undefined ? "" : secret).encryptInvitationToken(raw, weddingId, guestId));
});

function route({ authorized = true, guest = { id: guestId }, link = { token_encrypted: encrypted, token_hash: tokens.hashInvitationToken(raw) }, linkError = null, encryption = crypto, rpcError = null } = {}) {
  const calls = [];
  const supabase = {
    from(table) {
      calls.push(["from", table]);
      const query = {};
      for (const method of ["select", "eq", "is", "order", "limit"]) query[method] = (...args) => { calls.push([table, method, ...args]); return query; };
      query.maybeSingle = query.single = async () => table === "guests" ? { data: guest, error: null } : { data: link, error: linkError };
      return query;
    },
    rpc: async (...args) => { calls.push(["rpc", ...args]); return { error: rpcError }; },
  };
  return { calls, handlers: load("app/api/admin/guests/[id]/link/route.ts", { NEXT_PUBLIC_SITE_URL: "https://invitation.example" }, {
    "next/server": { NextResponse },
    "@/lib/auth/admin": { getAdmin: async () => authorized ? { admin: { wedding_id: weddingId }, supabase } : null },
    "@/lib/auth/confirm-guest-action": { confirmGuestAction: async () => null },
    "@/lib/invitations/token": tokens,
    "@/lib/invitations/storage": encryption,
  }) };
}
const request = () => new NextRequest(`https://admin.example/api/admin/guests/${guestId}/link`);
const params = () => ({ params: Promise.resolve({ id: guestId }) });

test("reopening requires admin authorization and never accesses data when unauthorized", async () => {
  const { calls, handlers } = route({ authorized: false });
  for (const method of ["GET", "POST"]) assert.equal((await handlers[method](request(), params())).status, 401);
  assert.equal(calls.length, 0);
});
test("reopening preserves the link, scopes queries and sends no cacheable secrets", async () => {
  const { calls, handlers } = route();
  const response = await handlers.GET(request(), params());
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /private, no-store/);
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.deepEqual(await response.json(), { invitationUrl: `https://invitation.example/i/${raw}` });
  assert.ok(calls.some((call) => call[0] === "invitation_links" && call[1] === "eq" && call[2] === "wedding_id" && call[3] === weddingId));
  assert.ok(calls.some((call) => call[0] === "invitation_links" && call[1] === "is" && call[2] === "revoked_at" && call[3] === null));
  assert.ok(!calls.some((call) => call[0] === "rpc"));
});
test("legacy links stay active and are never silently regenerated", async () => {
  const { calls, handlers } = route({ link: { token_encrypted: null } });
  const response = await handlers.GET(request(), params());
  assert.equal(response.status, 409);
  assert.equal((await response.json()).code, "legacy_link");
  assert.ok(!calls.some((call) => call[0] === "rpc"));
});
test("missing guests, revoked links and database errors expose no token", async () => {
  for (const [options, status] of [[{ guest: null }, 404], [{ link: null }, 404], [{ linkError: {} }, 500]]) {
    const { handlers } = route(options);
    const response = await handlers.GET(request(), params());
    assert.equal(response.status, status);
    assert.ok(!(await response.text()).includes(raw));
  }
});
test("decryption failures and mismatched hashes never expose tokens or revoke links", async () => {
  for (const options of [{ encryption: storage("b2".repeat(32)) }, { link: { token_encrypted: encrypted, token_hash: "0".repeat(64) } }]) {
    const { calls, handlers } = route(options);
    const response = await handlers.GET(request(), params());
    assert.equal(response.status, 503);
    assert.ok(!(await response.text()).includes(raw));
    assert.ok(!calls.some((call) => call[0] === "rpc"));
  }
});
test("regeneration saves recoverable ciphertext through an atomic database replacement", async () => {
  const { calls, handlers } = route();
  const response = await handlers.POST(request(), params());
  assert.equal(response.status, 200);
  const token = (await response.json()).invitationUrl.split("/").pop();
  const rpc = calls.find((call) => call[0] === "rpc");
  assert.equal(rpc[1], "replace_invitation_link");
  assert.equal(rpc[2].target_guest_id, guestId);
  assert.equal(crypto.decryptInvitationToken(rpc[2].new_token_encrypted, weddingId, guestId), token);
  assert.equal(rpc[2].new_token_hash, tokens.hashInvitationToken(token));
});
test("regeneration with no key performs no mutation; transaction failures return no new link", async () => {
  const { handlers, calls } = route({ encryption: storage("") });
  assert.equal((await handlers.POST(request(), params())).status, 503);
  assert.ok(!calls.some((call) => call[0] === "rpc"));
  const failed = route({ rpcError: {} });
  const response = await failed.handlers.POST(request(), params());
  assert.equal(response.status, 500);
  assert.equal((await response.json()).invitationUrl, undefined);
});
test("replacement SQL retains RLS and uses a guest lock and transaction", () => {
  const sql = fs.readFileSync("supabase/migrations/202610180002_recoverable_invitation_links.sql", "utf8");
  assert.match(sql, /security invoker/);
  assert.match(sql, /app_can_manage_wedding/);
  assert.match(sql, /for update/);
  assert.match(sql, /from public, anon/);
  assert.doesNotMatch(sql, /disable row level security/i);
});
