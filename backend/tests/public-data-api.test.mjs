import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(file, mocks = {}, env = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(source, {
    exports, URL, TextEncoder, TextDecoder, process: { env },
    require(name) {
      if (name === "server-only") return {};
      if (name === "@/lib/security/rate-limit") return { limitRequest: async () => null };
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name === "@/lib/media/signed-urls") return load("lib/media/signed-urls.ts");
      if (name === "@/lib/http/body") return load("lib/http/body.ts");
      if (["wedding-presentation", "dress-code", "invitation-copy", "section-images"].some((module) => name === `@/lib/${module}`)) {
        return load(`lib/${name.slice("@/lib/".length)}.ts`);
      }
      return require(name);
    },
  });
  return exports;
}

function clientFor(rows) {
  const calls = [];
  const client = {
    from(table) {
      calls.push(["from", table]);
      return {
        select(columns) { calls.push([table, "select", columns]); return this; },
        eq(key, value) { calls.push([table, key, value]); return this; },
        order(key, options) { calls.push([table, "order", key, options]); return this; },
        limit(value) { calls.push([table, "limit", value]); return this; },
        maybeSingle: async () => rows[table],
        then(resolve) { return Promise.resolve(rows[table]).then(resolve); },
      };
    },
    storage: { from(bucket) {
      calls.push(["bucket", bucket]);
      return { async createSignedUrls(paths, lifetime) {
        calls.push(["sign", Array.from(paths), lifetime]);
        return { data: paths.map((path) => path === "missing"
          ? { path, error: "not found" }
          : { path, signedUrl: `https://storage.example/${path}` }) };
      } };
    } },
  };
  return { client, calls };
}

test("public media signs each unique file once, preserves order and exposes no storage paths", async () => {
  const assets = [
    { id: "second", storage_path: "shared", mime_type: "image/jpeg", alt_text: "Second", created_at: "2026-10-21" },
    { id: "first", storage_path: "shared", mime_type: "image/jpeg", alt_text: "First", created_at: "2026-10-20" },
    { id: "missing", storage_path: "missing", mime_type: "image/jpeg", created_at: "2026-10-19" },
  ];
  const { client, calls } = clientFor({ weddings: { data: { id: "wedding" } }, media_assets: { data: assets } });
  const { GET } = load("app/api/public/media/route.ts", { "@/lib/supabase/public-server": { createPublicClient: () => client } });
  const response = await GET();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /no-store/);
  const { data } = await response.json();
  assert.deepEqual(data.map((item) => item.id), ["second", "first"]);
  assert.equal(data[0].url, data[1].url);
  assert.ok(data.every((item) => !("storage_path" in item)));
  assert.deepEqual(calls.filter(([name]) => name === "sign"), [["sign", ["shared", "missing"], 3600]]);
  assert.ok(calls.some(([table, key, value]) => table === "weddings" && key === "is_published" && value === true));
  assert.ok(calls.some(([table, key, value]) => table === "media_assets" && key === "is_public" && value === true));
  assert.ok(calls.some(([table, key, value]) => table === "media_assets" && key === "wedding_id" && value === "wedding"));
  assert.ok(calls.some(([table, key, value]) => table === "media_assets" && key === "limit" && value === 100));
});

test("public media performs no signing when the published wedding has no assets", async () => {
  const { client, calls } = clientFor({ weddings: { data: { id: "wedding" } }, media_assets: { data: [] } });
  const { GET } = load("app/api/public/media/route.ts", { "@/lib/supabase/public-server": { createPublicClient: () => client } });
  assert.deepEqual(await (await GET()).json(), { data: [] });
  assert.equal(calls.filter(([name]) => name === "sign").length, 0);
});

test("public content and media distinguish database failure from an unpublished wedding without exposing errors", async () => {
  for (const route of ["content", "media"]) {
    for (const [weddingResult, expectedStatus] of [[{ data: null }, 200], [{ error: { message: "private database details" } }, 500]]) {
      const { client, calls } = clientFor({ weddings: weddingResult });
      const { GET } = load(`app/api/public/${route}/route.ts`, { "@/lib/supabase/public-server": { createPublicClient: () => client } });
      const response = await GET();
      assert.equal(response.status, expectedStatus);
      assert.match(response.headers.get("cache-control"), /no-store/);
      assert.doesNotMatch(await response.text(), /private database details/);
      assert.deepEqual(calls.filter(([name]) => name === "from"), [["from", "weddings"]]);
    }
  }
});

test("anonymous public client does not read or persist administrator cookies", () => {
  const calls = [];
  const { createPublicClient } = load("lib/supabase/public-server.ts", {
    "@supabase/supabase-js": { createClient(...args) { calls.push(args); return "anonymous-client"; } },
  }, { NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-key" });
  assert.equal(createPublicClient(), "anonymous-client");
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [["https://example.supabase.co", "public-key", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  }]]);
});

test("public wedding endpoint forwards the slug and never caches signed URLs or failures", async () => {
  const calls = [];
  const { GET } = load("app/api/public/wedding/route.ts", { "@/lib/wedding-public": { async getPublicWedding(slug) {
    calls.push(slug);
    if (slug === "failure") throw new Error("private error");
    if (slug === "unpublished") return null;
    return { wedding: { id: "wedding", groom_name: "Minh", bride_name: "Huệ", wedding_date: "2026-10-18T18:00:00+07:00" }, imageUrls: { image: "signed-url" }, content: {} };
  } } });
  for (const [query, status] of [["?slug=our-wedding", 200], ["", 200], ["?slug=unpublished", 200], ["?slug=failure", 500], ["?slug=", 404]]) {
    const response = await GET(new Request(`http://localhost/api/public/wedding${query}`));
    assert.equal(response.status, status);
    assert.match(response.headers.get("cache-control"), /no-store/);
    const body = await response.json();
    assert.doesNotMatch(JSON.stringify(body), /private error/);
    if (status === 200) {
      assert.equal(body.presentation.groomName, query === "?slug=unpublished" ? "{{groom_name}}" : "Minh");
      assert.equal(body.presentation.date, query === "?slug=unpublished" ? "{{wedding_date}}" : "18.10.2026");
      assert.equal(body.data === null, query === "?slug=unpublished");
    }
  }
  assert.deepEqual(calls, ["our-wedding", undefined, "unpublished", "failure"]);
});

test("invitation endpoint validates hashes, returns a minimal contract and uses generic no-store failures", async () => {
  const calls = [];
  let result = { data: { guest_name: "Khách", wedding_slug: "our-wedding", guest_group: "groom", private_value: "hidden" } };
  const { POST } = load("app/api/public/invitation/route.ts", { "@/lib/supabase/public-server": { createPublicClient: () => ({
    rpc(name, args) { calls.push([name, JSON.parse(JSON.stringify(args))]); return { maybeSingle: async () => result }; },
  }) } });
  const request = (body) => new Request("http://localhost/api/public/invitation", { method: "POST", body });
  const hash = "a".repeat(64);
  const success = await POST(request(JSON.stringify({ tokenHash: hash })));
  assert.equal(success.status, 200);
  assert.match(success.headers.get("cache-control"), /no-store/);
  assert.deepEqual(await success.json(), { data: { guest_name: "Khách", wedding_slug: "our-wedding", guest_group: "groom" } });
  assert.deepEqual(calls, [["resolve_invitation_token", { input_token_hash: hash }]]);

  const invalidBodies = ["{", "null", "{}", JSON.stringify({ tokenHash: "bad" }), JSON.stringify({ tokenHash: hash, padding: "x".repeat(1024) })];
  for (const body of invalidBodies) {
    const response = await POST(request(body));
    assert.equal(response.status, 404);
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.deepEqual(await response.json(), { error: "Không tìm thấy thiệp mời." });
  }
  assert.equal(calls.length, 1);

  for (result of [{ data: null }, { error: { message: "private database error" } }, { data: { guest_name: "Khách", wedding_slug: "our-wedding", guest_group: "other" } }]) {
    const response = await POST(request(JSON.stringify({ tokenHash: hash })));
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "Không tìm thấy thiệp mời." });
  }
});
