import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

test("public wedding batches unique image paths and shares work for the same slug", async () => {
  const id = "11111111-1111-1111-1111-111111111111";
  const second = "22222222-2222-2222-2222-222222222222";
  const failed = "33333333-3333-3333-3333-333333333333";
  const calls = [];
  const rows = {
    weddings: { id: "wedding", groom_name: "Minh" },
    wedding_content: [
      { section_key: "hero", content: { cover_media_id: id, intro_media_id: second } },
      { section_key: "gifts", content: { gift_banner_media_id: id, groom_qr_media_id: failed } },
    ],
    media_assets: [{ id, storage_path: "photo" }, { id: second, storage_path: "photo" }, { id: failed, storage_path: "missing" }],
  };
  const client = {
    from(table) {
      calls.push(["from", table]);
      const query = {
        select() { return this; },
        eq(key, value) { calls.push([table, key, value]); return this; },
        in(key, values) { calls.push([table, key, values]); return this; },
        maybeSingle: async () => ({ data: rows[table] }),
        then(resolve) { return Promise.resolve({ data: rows[table] }).then(resolve); },
      };
      return query;
    },
    storage: { from: () => ({ async createSignedUrls(paths) {
      calls.push(["sign", paths]);
      return { data: [{ path: "photo", signedUrl: "https://example.com/signed" }, { path: "missing", error: "not found", signedUrl: "" }] };
    } }) },
  };
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync("lib/wedding-public.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: "https://example.com", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public" } },
    require(name) {
      if (name === "react") return { cache(fn) {
        const memo = new Map();
        return (slug) => { if (!memo.has(slug)) memo.set(slug, fn(slug)); return memo.get(slug); };
      } };
      if (name === "@/lib/supabase/public-server") return { createPublicClient: () => client };
      if (name === "@/lib/media/signed-urls") {
        const helper = {};
        const code = ts.transpileModule(fs.readFileSync("lib/media/signed-urls.ts", "utf8"), {
          compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
        }).outputText;
        vm.runInNewContext(code, { exports: helper });
        return helper;
      }
      throw new Error(name);
    },
  });
  const [page, gift] = await Promise.all([exports.getPublicWedding("test"), exports.getPublicWedding("test")]);
  assert.equal(page, gift);
  assert.equal(calls.filter(([type]) => type === "from").length, 3);
  assert.equal(calls.filter(([type]) => type === "sign").length, 1);
  assert.deepEqual(Array.from(calls.find(([type]) => type === "sign")[1]), ["photo", "missing"]);
  assert.equal(page.imageUrls[id], page.imageUrls[second]);
  assert.equal(page.imageUrls[failed], undefined);
  for (const table of ["weddings", "wedding_content"]) assert.ok(calls.some(([t, key, value]) => t === table && key === "is_published" && value === true));
  assert.ok(calls.some(([t, key, value]) => t === "media_assets" && key === "is_public" && value === true));
  assert.ok(calls.some(([t, key, value]) => t === "media_assets" && key === "wedding_id" && value === "wedding"));
});
