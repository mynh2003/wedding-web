import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(file, dependencies = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, File, Uint8Array, TextDecoder, console: { error() {} }, require: (name) => dependencies[name] ?? require(name) });
  return exports;
}
const validation = load("lib/validation/content.ts");
function route({ authorized = true, uploadError = null, metadataError = null } = {}) {
  const calls = [];
  const storage = {
    async upload(...args) { calls.push(["upload", ...args]); return { error: uploadError }; },
    async remove(...args) { calls.push(["remove", ...args]); return { error: null }; },
  };
  const supabase = {
    storage: { from(bucket) { assert.equal(bucket, "wedding-private"); return storage; } },
    from(table) {
      assert.equal(table, "media_assets");
      return { insert(data) {
        calls.push(["insert", data]);
        return { select: () => ({ single: async () => ({ data: { id: "new-media", ...data }, error: metadataError }) }) };
      } };
    },
  };
  const handlers = load("app/api/admin/media/route.ts", {
    "@/lib/auth/admin": { getAdmin: async () => authorized ? { admin: { wedding_id: "12345678-1234-1234-1234-123456789abc" }, supabase } : null },
    "@/lib/validation/content": validation,
  });
  return { calls, handlers };
}
function request(file = new File([new Uint8Array([255, 216, 255, 224])], "ảnh cưới.jpg", { type: "image/jpeg" })) {
  const form = new FormData();
  form.set("file", file);
  form.set("altText", "  Ảnh cưới  ");
  return new Request("https://admin.example/api/admin/media", { method: "POST", body: form });
}

test("upload requires an admin and rejects invalid files before storage", async () => {
  const unauthorized = route({ authorized: false });
  assert.equal((await unauthorized.handlers.POST(request())).status, 401);
  assert.equal(unauthorized.calls.length, 0);
  const invalid = route();
  assert.equal((await invalid.handlers.POST(request(new File(["bad"], "bad.jpg", { type: "image/jpeg" })))).status, 400);
  assert.equal((await invalid.handlers.POST(new Request("https://admin.example/api/admin/media", { method: "POST", body: "bad form" }))).status, 400);
  assert.equal(invalid.calls.length, 0);
});

test("valid media uses an admin-scoped path and private metadata", async () => {
  const { calls, handlers } = route();
  const response = await handlers.POST(request());
  assert.equal(response.status, 201);
  const data = (await response.json()).data;
  assert.match(data.storage_path, /^12345678-1234-1234-1234-123456789abc\/[0-9a-f-]{36}\.jpg$/);
  assert.equal(data.is_public, false);
  assert.equal(data.alt_text, "Ảnh cưới");
  assert.equal(calls[0][3].upsert, false);
  assert.equal(calls.length, 2);
});

test("storage failures give actionable errors and never insert metadata", async () => {
  for (const [uploadError, status, message] of [
    [{ name: "StorageApiError", message: "Bucket not found", statusCode: "404" }, 503, /202610180005_repair_media_storage/],
    [{ name: "StorageApiError", message: "new row violates row-level security policy", statusCode: "403" }, 403, /Không có quyền/],
    [{ name: "StorageApiError", message: "too large", statusCode: "413" }, 413, /10MB/],
    [{ name: "StorageApiError", message: "rate limited", statusCode: "429" }, 429, /quá nhiều/],
    [{ name: "StorageUnknownError", message: "fetch failed: internal details" }, 502, /Vui lòng thử lại/],
  ]) {
    const { calls, handlers } = route({ uploadError });
    const response = await handlers.POST(request());
    assert.equal(response.status, status);
    assert.match((await response.json()).error, message);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(calls.length, 1);
  }
});

test("metadata failure removes the uploaded file", async () => {
  const { calls, handlers } = route({ metadataError: { code: "42501", message: "permission denied" } });
  assert.equal((await handlers.POST(request())).status, 500);
  assert.equal(calls[2][0], "remove");
  assert.equal(calls[2][1][0], calls[0][1]);
});
