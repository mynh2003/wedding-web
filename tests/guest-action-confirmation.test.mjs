import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { NextRequest, NextResponse } = require("next/server");
function load(file, dependencies = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, process, TextEncoder, require: (name) => name === "server-only" ? {} : dependencies[name] ?? require(name) });
  return exports;
}
const bodyReader = load("lib/http/body.ts");
const context = { user: { id: "admin-a", email: "admin@example.com" }, admin: { wedding_id: "wedding-a" } };
const validBody = { action: "delete-guest", guestId: "guest-a", confirmed: true, password: "test-password" };
const request = (body = validBody, method = "DELETE") => new NextRequest("https://admin.example/api/admin/guests/guest-a", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
function confirmation({ trusted = true, user = { id: "admin-a", email_confirmed_at: "2026-10-18" }, error = null, offline = false } = {}) {
  const calls = [];
  const { confirmGuestAction } = load("lib/auth/confirm-guest-action.ts", {
    "@/lib/http/body": bodyReader,
    "@/lib/auth/origin": { hasTrustedOrigin: () => trusted },
    "@supabase/supabase-js": { createClient: (...args) => {
      calls.push(["client", ...args]);
      return { auth: {
        signInWithPassword: async (credentials) => { calls.push(["verify", credentials]); if (offline) throw new Error("offline"); return { data: { user }, error }; },
        signOut: async (options) => { calls.push(["signOut", options]); return { error: null }; },
      } };
    } },
  });
  return { confirmGuestAction, calls };
}

test("untrusted origins and missing, wrong-action or wrong-guest confirmations never attempt authentication", async () => {
  const untrusted = confirmation({ trusted: false });
  assert.equal((await untrusted.confirmGuestAction(request(), context, "guest-a", "delete-guest")).status, 403);
  assert.equal(untrusted.calls.length, 0);
  const check = confirmation();
  for (const body of [null, {}, { ...validBody, confirmed: false }, { ...validBody, action: "regenerate-link" }, { ...validBody, guestId: "guest-b" }, { ...validBody, password: "" }, { ...validBody, password: "a".repeat(257) }]) {
    assert.equal((await check.confirmGuestAction(request(body), context, "guest-a", "delete-guest")).status, 400);
  }
  assert.equal(check.calls.length, 0);
});

test("password reauthentication checks the same verified admin and uses an isolated temporary session", async () => {
  const check = confirmation();
  assert.equal(await check.confirmGuestAction(request(), context, "guest-a", "delete-guest"), null);
  assert.equal(check.calls[0][3].auth.persistSession, false);
  assert.equal(check.calls[0][3].auth.autoRefreshToken, false);
  assert.equal(check.calls[1][1].email, context.user.email);
  assert.equal(check.calls[1][1].password, validBody.password);
  assert.equal(check.calls[2][1].scope, "local");
  for (const options of [{ error: { status: 400 } }, { user: { id: "different-admin", email_confirmed_at: "yes" } }, { user: { id: "admin-a" } }, { user: null }]) {
    assert.equal((await confirmation(options).confirmGuestAction(request(), context, "guest-a", "delete-guest")).status, 403);
  }
  assert.equal((await confirmation({ error: { status: 429 } }).confirmGuestAction(request(), context, "guest-a", "delete-guest")).status, 429);
  assert.equal((await confirmation({ offline: true }).confirmGuestAction(request(), context, "guest-a", "delete-guest")).status, 503);
});

test("delete, restore and regeneration endpoints refuse to mutate without successful reauthentication", async () => {
  for (const [file, method, action] of [["app/api/admin/guests/[id]/route.ts", "DELETE", "delete-guest"], ["app/api/admin/guests/[id]/restore/route.ts", "POST", "restore-guest"], ["app/api/admin/guests/[id]/link/route.ts", "POST", "regenerate-link"]]) {
    const calls = [];
    const dependencies = {
      "@/lib/auth/admin": { getAdmin: async () => ({ ...context, supabase: { from: () => { throw new Error("DB access before confirmation"); }, rpc: () => { throw new Error("Mutation before confirmation"); } } }) },
      "@/lib/auth/confirm-guest-action": { confirmGuestAction: async (_request, _context, id, operation) => { calls.push([id, operation]); return NextResponse.json({ error: "Reauthentication required" }, { status: 403 }); } },
      "@/lib/http/body": bodyReader,
      "@/lib/validation/guest": {},
      "@/lib/invitations/token": {},
      "@/lib/invitations/storage": {},
    };
    const handlers = load(file, dependencies);
    const response = await handlers[method](request(validBody, method), { params: Promise.resolve({ id: "guest-a" }) });
    assert.equal(response.status, 403);
    assert.deepEqual(calls, [["guest-a", action]]);
  }
});
