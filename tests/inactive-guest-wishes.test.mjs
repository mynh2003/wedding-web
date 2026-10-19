import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
function load(file, dependencies = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, process, require: (name) => dependencies[name] ?? require(name) });
  return exports;
}

test("admin API marks linked trashed wishes inactive without exposing guest metadata", async () => {
  const rows = [
    { id: "trashed", status: "approved", guest: { deleted_at: "2026-10-18" } },
    { id: "active", status: "pending", guest: { deleted_at: null } },
    { id: "standalone", status: "approved", guest: null },
  ];
  const query = {};
  for (const method of ["select", "eq", "order"]) query[method] = () => query;
  query.limit = async () => ({ data: rows, error: null });
  const { GET } = load("app/api/admin/wishes/route.ts", {
    "@/lib/auth/admin": { getAdmin: async () => ({ admin: { wedding_id: "wedding-a" }, supabase: { from: () => query } }) },
  });
  const response = await GET();
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).data, [
    { id: "trashed", status: "approved", guest_inactive: true },
    { id: "active", status: "pending", guest_inactive: false },
    { id: "standalone", status: "approved", guest_inactive: false },
  ]);
});

test("attempting approval for an inactive guest returns an actionable conflict", async () => {
  const query = {};
  query.update = query.eq = () => query;
  query.then = (resolve) => resolve({ error: { code: "23514" } });
  const { PATCH } = load("app/api/admin/wishes/[id]/route.ts", {
    "@/lib/auth/admin": { getAdmin: async () => ({ admin: { wedding_id: "wedding-a" }, supabase: { from: () => query } }) },
  });
  const response = await PATCH(new Request("https://admin.example/api/admin/wishes/wish-a", { method: "PATCH", body: JSON.stringify({ status: "approved" }) }), { params: Promise.resolve({ id: "wish-a" }) });
  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /khôi phục khách/);
});

test("inactive wishes are excluded from active moderation filters and cannot be approved in the UI", () => {
  const rows = [
    { id: "trashed", author_name: "Khách đã xóa mềm", message: "Lời chúc tạm ẩn", status: "pending", created_at: "2026-10-18", guest_inactive: true },
    { id: "standalone", author_name: "Khách chung", message: "Lời chúc công khai", status: "approved", created_at: "2026-10-18", guest_inactive: false },
  ];
  const render = (filter) => {
    const { WishManager } = load("components/wish-manager.tsx", {
      react: { ...React, useEffect: () => {}, useState: (initial) => [Array.isArray(initial) ? rows : initial === "pending" ? filter : initial === true ? false : initial, () => {}] },
      "@/components/admin-shell": { AdminHeading: () => null, AdminIcon: () => null },
      "@/components/wish-side-badge": load("components/wish-side-badge.tsx"),
    });
    return renderToStaticMarkup(React.createElement(WishManager));
  };
  const inactive = render("inactive");
  assert.match(inactive, /Lời chúc tạm ẩn/);
  assert.doesNotMatch(inactive, /Lời chúc công khai/);
  assert.match(inactive, /<button disabled=""[^>]*>Duyệt lời chúc<\/button>/);
  const approved = render("approved");
  assert.match(approved, /Lời chúc công khai/);
  assert.doesNotMatch(approved, /Lời chúc tạm ẩn/);
  assert.doesNotMatch(render("pending"), /Lời chúc tạm ẩn/);
});

test("database visibility follows guest deletion and restoration without losing moderation decisions", () => {
  const sql = fs.readFileSync("supabase/migrations/202610180011_inactive_guest_wishes.sql", "utf8");
  assert.match(sql, /guests_wish_visibility after update of deleted_at/);
  assert.match(sql, /delete from public\.public_wishes p using public\.wishes wish/);
  assert.match(sql, /wish\.guest_id = new\.id[\s\S]*wish\.status = 'approved'/);
  assert.match(sql, /before insert or update of status, guest_id/);
  assert.match(sql, /guest_deleted_at is not null[\s\S]*errcode = '23514'/);
  assert.match(sql, /exists \(select 1 from public\.public_wishes p where p\.id = wishes\.id\)/);
  assert.doesNotMatch(sql, /update public\.wishes set status/);
  assert.doesNotMatch(sql, /delete from public\.wishes/);
});
