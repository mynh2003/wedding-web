import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(file, dependencies = {}, env) {
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, File, Response, URL, Uint8Array, TextDecoder, ...(env ? { process: { env } } : {}), console: { error() {} }, require: (name) => dependencies[name] ?? (name === "server-only" ? {} : name === "@/lib/http/body" ? load("lib/http/body.ts") : name === "@/lib/dress-code" ? load("lib/dress-code.ts") : require(name)) });
  return exports;
}
const validation = load("lib/validation/content.ts");
function route({ authorized = true, uploadError = null, metadataError = null, mediaRows = [], mediaError = null, configuredValidation = validation } = {}) {
  const calls = [];
  const storage = {
    async upload(...args) { calls.push(["upload", ...args]); return { error: uploadError }; },
    async remove(...args) { calls.push(["remove", ...args]); return { error: null }; },
    async createSignedUrls(paths, lifetime) {
      calls.push(["sign", Array.from(paths), lifetime]);
      return { data: paths.map((path) => path === "missing"
        ? { path, error: "not found" } : { path, signedUrl: `https://storage.example/${path}` }) };
    },
  };
  const supabase = {
    storage: { from(bucket) { assert.equal(bucket, "wedding-private"); return storage; } },
    from(table) {
      assert.equal(table, "media_assets");
      const query = {
        select(columns) { calls.push(["select", columns]); return query; },
        eq(key, value) { calls.push(["eq", key, value]); return query; },
        like() { return query; },
        order(key, options) { calls.push(["order", key, options]); return query; },
        async range(start, end) { const rows = mediaRows.filter(row => row.mime_type.startsWith("image/")); calls.push(["range", start, end]); return { data: rows.slice(start, end + 1), error: mediaError, count: rows.length }; },
        insert(data) {
          calls.push(["insert", data]);
          return { select: () => ({ single: async () => ({ data: { id: "new-media", ...data }, error: metadataError }) }) };
        },
      };
      return query;
    },
  };
  const handlers = load("app/api/admin/media/route.ts", {
    "@/lib/auth/admin": { getAdmin: async () => authorized ? { admin: { wedding_id: "12345678-1234-1234-1234-123456789abc" }, supabase } : null },
    "@/lib/validation/content": configuredValidation,
    "@/lib/media/signed-urls": load("lib/media/signed-urls.ts"),
    "@/lib/media/optimize-image": { optimizeUploadedImage: async () => new Uint8Array([82, 73, 70, 70, 12, 0, 0, 0, 87, 69, 66, 80]) },
  });
  return { calls, handlers };
}
function request(file = new File([new Uint8Array([255, 216, 255, 224])], "ảnh cưới.jpg", { type: "image/jpeg" })) {
  const form = new FormData();
  form.set("file", file);
  form.set("altText", "  Ảnh cưới  ");
  return new Request("https://admin.example/api/admin/media", { method: "POST", body: form });
}

test("admin media lists all private metadata with one batch for unique image previews", async () => {
  const mediaRows = [
    { id: "private", storage_path: "shared", mime_type: "image/jpeg", is_public: false },
    { id: "audio", storage_path: "music.mp3", mime_type: "audio/mpeg", is_public: true },
    { id: "public", storage_path: "shared", mime_type: "image/jpeg", is_public: true },
    { id: "missing", storage_path: "missing", mime_type: "image/webp", is_public: false },
  ];
  const { calls, handlers } = route({ mediaRows });
  const response = await handlers.GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual((await response.json()).data, [
    { ...mediaRows[0], url: "https://storage.example/shared" },
    { ...mediaRows[2], url: "https://storage.example/shared" },
    { ...mediaRows[3], url: null },
  ]);
  assert.deepEqual(calls.filter(([type]) => type === "sign"), [["sign", ["shared", "missing"], 3600]]);
  assert.ok(calls.some(([type, key, value]) => type === "eq" && key === "wedding_id" && value === "12345678-1234-1234-1234-123456789abc"));
});

test("admin media does not sign files for unauthorized, failed or audio-only listings", async () => {
  const unauthorized = route({ authorized: false });
  assert.equal((await unauthorized.handlers.GET()).status, 401);
  assert.equal(unauthorized.calls.length, 0);
  const failed = route({ mediaError: { message: "database failure" } });
  assert.equal((await failed.handlers.GET()).status, 500);
  assert.equal(failed.calls.filter(([type]) => type === "sign").length, 0);
  const mediaRows = [{ id: "audio", storage_path: "music.mp3", mime_type: "audio/mpeg", is_public: false }];
  const audio = route({ mediaRows });
  assert.deepEqual((await (await audio.handlers.GET()).json()).data, []);
  assert.equal(audio.calls.filter(([type]) => type === "sign").length, 0);
});

test("library pagination returns at most 24 previews and rejects invalid pages without a media read", async () => {
  const mediaRows=Array.from({length:60},(_,index)=>({id:String(index),storage_path:`image-${index}`,mime_type:"image/webp"}));
  const check=route({mediaRows});
  const response=await check.handlers.GET(new Request("https://admin.example/api/admin/media?page=2"));
  const body=await response.json();assert.equal(body.data.length,24);assert.equal(body.data[0].id,"24");assert.equal(body.total,60);
  assert.deepEqual(check.calls.find(call=>call[0]==="range"),["range",24,47]);
  assert.equal(check.calls.find(call=>call[0]==="sign")[1].length,24);
  const invalid=route();assert.equal((await invalid.handlers.GET(new Request("https://admin.example/api/admin/media?page=-1"))).status,400);assert.equal(invalid.calls.length,0);
});

test("media size defaults to 10MB and configurable limits stay between 1 and 10MB", () => {
  assert.equal(validation.MAX_MEDIA_BYTES, 10 * 1024 * 1024);
  assert.equal(validation.MAX_MEDIA_LABEL, "10MB");
  for (const [setting, expected] of [["4", 4], ["20", 10], ["0", 1], ["-5", 1], ["4.8", 4], ["invalid", 10], ["Infinity", 10], ["", 10]]) {
    const configured = load("lib/validation/content.ts", {}, { NEXT_PUBLIC_MAX_UPLOAD_MB: setting });
    assert.equal(configured.MAX_MEDIA_BYTES, expected * 1024 * 1024);
    assert.equal(configured.MAX_MEDIA_LABEL, `${expected}MB`);
  }
});

test("a 4MB upload cap rejects oversized files before contacting storage", async () => {
  const configuredValidation = load("lib/validation/content.ts", {}, { NEXT_PUBLIC_MAX_UPLOAD_MB: "4" });
  const { calls, handlers } = route({ configuredValidation });
  const file = new File([new Uint8Array(configuredValidation.MAX_MEDIA_BYTES + 1)], "large.jpg", { type: "image/jpeg" });
  const response = await handlers.POST(request(file));
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /4MB/);
  assert.equal(calls.length, 0);

  let formRead = false;
  const preflight = await handlers.POST({
    headers: new Headers({ "content-length": String(6 * 1024 * 1024) }),
    async formData() { formRead = true; throw new Error("Oversized form must not be parsed"); },
  });
  assert.equal(preflight.status, 413);
  assert.match((await preflight.json()).error, /4MB/);
  assert.equal(formRead, false);
  assert.equal(calls.length, 0);
});

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
  assert.match(data.storage_path, /^12345678-1234-1234-1234-123456789abc\/[0-9a-f-]{36}\.webp$/);
  assert.equal(data.mime_type, "image/webp");
  assert.equal(calls[0][3].contentType, "image/webp");
  assert.equal(data.is_public, false);
  assert.equal(data.alt_text, "Ảnh cưới");
  assert.equal(calls[0][3].upsert, false);
  assert.equal(calls.length, 2);
});

test("storage failures give actionable errors and never insert metadata", async () => {
  for (const [uploadError, status, message] of [
    [{ name: "StorageApiError", message: "Bucket not found", statusCode: "404" }, 503, /chưa sẵn sàng/],
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
