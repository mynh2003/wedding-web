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
  vm.runInNewContext(source, { exports, process, require: (name) => dependencies[name] ?? require(name) });
  return exports;
}
const params = { params: Promise.resolve({ id: "guest-a" }) };
const request = (suffix = "", method = "DELETE") => new NextRequest(`https://admin.example/api/admin/guests/guest-a${suffix}`, { method });
function handlers({ authorized = true, confirmed = true, error = null, restore = false } = {}) {
  const calls = [];
  const dependencies = {
    "@/lib/auth/admin": { getAdmin: async () => authorized ? { admin: { wedding_id: "wedding-a" }, supabase: { rpc: async (name, args) => { calls.push(["rpc", name, args]); return { error }; } } } : null },
    "@/lib/auth/confirm-guest-action": { confirmGuestAction: async (_request, _context, id, action) => { calls.push(["confirm", id, action]); return confirmed ? null : NextResponse.json({ error: "Denied" }, { status: 403 }); } },
    "@/lib/http/body": {}, "@/lib/validation/guest": {},
  };
  return { calls, route: load(`app/api/admin/guests/[id]/${restore ? "restore/" : ""}route.ts`, dependencies) };
}

test("DELETE defaults to soft deletion; permanent deletion is explicit and separately confirmed", async () => {
  for (const [suffix, action, dbAction] of [["", "delete-guest", "trash"], ["?mode=soft", "delete-guest", "trash"], ["?mode=permanent", "hard-delete-guest", "purge"]]) {
    const { calls, route } = handlers();
    const response = await route.DELETE(request(suffix), params);
    assert.equal(response.status, 204);
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.equal(calls[0][2], action);
    assert.equal(calls[1][1], "manage_guest_lifecycle");
    assert.equal(calls[1][2].target_guest_id, "guest-a");
    assert.equal(calls[1][2].input_action, dbAction);
  }
});

test("invalid modes, unauthorized callers and denied reauthentication perform no deletion", async () => {
  const invalid = handlers();
  assert.equal((await invalid.route.DELETE(request("?mode=hard"), params)).status, 400);
  assert.equal(invalid.calls.length, 0);
  for (const suffix of ["", "?mode=permanent"]) {
    const denied = handlers({ confirmed: false });
    assert.equal((await denied.route.DELETE(request(suffix), params)).status, 403);
    assert.equal(denied.calls.length, 1);
    const unauthorized = handlers({ authorized: false });
    assert.equal((await unauthorized.route.DELETE(request(suffix), params)).status, 401);
    assert.equal(unauthorized.calls.length, 0);
  }
});

test("restore requires its own confirmation and invokes the atomic restore operation", async () => {
  const { calls, route } = handlers({ restore: true });
  assert.equal((await route.POST(request("/restore", "POST"), params)).status, 204);
  assert.equal(calls[0][2], "restore-guest");
  assert.equal(calls[1][2].input_action, "restore");
  const denied = handlers({ restore: true, confirmed: false });
  assert.equal((await denied.route.POST(request("/restore", "POST"), params)).status, 403);
  assert.equal(denied.calls.length, 1);
});

test("missing guests and invalid lifecycle transitions return errors rather than success", async () => {
  for (const [code, status] of [["P0002", 404], ["23514", 409], ["XX000", 500]]) {
    const deletion = handlers({ error: { code } });
    assert.equal((await deletion.route.DELETE(request("?mode=permanent"), params)).status, status);
    const restore = handlers({ restore: true, error: { code } });
    assert.equal((await restore.route.POST(request("/restore", "POST"), params)).status, status);
  }
});

test("active and trash lists isolate guests and counts by wedding and deletion state", async () => {
  for (const trash of [false, true]) {
    const calls = [];
    const query = {};
    for (const method of ["select", "eq", "is", "not", "ilike", "order"]) query[method] = (...args) => { calls.push([method, ...args]); return query; };
    query.range = async () => ({ data: [], count: 0, error: null });
    const { GET } = load("app/api/admin/guests/route.ts", {
      "@/lib/auth/admin": { getAdmin: async () => ({ admin: { wedding_id: "wedding-a" }, supabase: { from: () => query } }) },
      "@/lib/http/body": {}, "@/lib/invitations/token": {}, "@/lib/invitations/storage": {}, "@/lib/validation/guest": {},
    });
    assert.equal((await GET(new NextRequest(`https://admin.example/api/admin/guests${trash ? "?view=trash" : ""}`))).status, 200);
    assert.ok(calls.some((call) => call[0] === "eq" && call[1] === "wedding_id" && call[2] === "wedding-a"));
    assert.ok(calls.some((call) => call[0] === (trash ? "not" : "is") && call[1] === "deleted_at"));
    assert.ok(calls.some((call) => call[0] === "order" && call[1] === (trash ? "deleted_at" : "created_at")));
  }
});

test("migration preserves guest data on trash and restore and blocks public access while trashed", () => {
  const sql = fs.readFileSync("supabase/migrations/202610180009_guest_deletion.sql", "utf8");
  const lifecycle = sql.slice(sql.indexOf("create function"), sql.indexOf("-- Public resolvers"));
  assert.match(lifecycle, /security invoker/);
  assert.match(lifecycle, /app_can_manage_wedding\(target_wedding\)/);
  assert.match(lifecycle, /for update/);
  assert.match(lifecycle, /coalesce\(deleted_at, clock_timestamp\(\)\)/);
  assert.match(lifecycle, /input_action = 'purge' then\s+if deletion_time is null then\s+raise exception/);
  assert.doesNotMatch(lifecycle, /delete from public\.(wishes|invitation_links)/);
  assert.match(lifecycle, /from public, anon/);
  for (const name of ["resolve_invitation_token", "submit_invitation_response", "replace_invitation_link"]) {
    const body = sql.split(`create or replace function public.${name}`)[1].split("$$;")[0];
    assert.match(body, /deleted_at is null/);
  }
  assert.match(sql, /^begin;[\s\S]*commit;/m);
});
