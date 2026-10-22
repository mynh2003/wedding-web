import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = ts.transpileModule(fs.readFileSync("app/api/wishes/route.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function route(results) {
  const calls = [];
  const errors = [];
  const supabase = {
    from(table) {
      const call = { table };
      calls.push(call);
      const query = {
        select(columns) { call.columns = columns; return query; },
        eq(column, value) { call.filter = [column, value]; return query; },
        order(column, options) { call.order = [column, options]; return query; },
        async limit(value) { call.limit = value; return results[calls.length - 1]; },
      };
      return query;
    },
  };
  const exports = {};
  vm.runInNewContext(source, {
    exports, process: { env: { NEXT_PUBLIC_WEDDING_SLUG: "test-wedding" } },
    console: { error: (...args) => errors.push(args) },
    require: (name) => {
      if (name === "@/lib/supabase/public-server") return { createPublicClient: () => supabase };
      if (name === "@/lib/supabase/server") throw new Error("Public wishes must not read administrator cookies");
      if (name.startsWith("@/")) return {};
      return require(name);
    },
  });
  return { GET: exports.GET, calls, errors };
}

const wish = { id: "wish-a", author_name: "Khách", message: "Chúc hạnh phúc!", created_at: "2026-10-18" };
const missingSide = { code: "42703", message: "column public_wishes.side does not exist" };

test("public wishes preserve side labels on the current schema", async () => {
  const { GET, calls } = route([{ data: [{ ...wish, side: "bride" }], error: null }]);
  const response = await GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual((await response.json()).data, [{ ...wish, side: "bride" }]);
  assert.equal(calls.length, 1);
});

test("missing side column falls back to the same scoped, ordered public projection", async () => {
  const { GET, calls, errors } = route([
    { data: null, error: missingSide },
    { data: [wish], error: null },
  ]);
  const response = await GET();
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).data, [{ ...wish, side: null }]);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].columns, "id, author_name, message, created_at");
  for (const call of calls) {
    assert.equal(call.table, "public_wishes");
    assert.deepEqual(call.filter, ["wedding_slug", "test-wedding"]);
    assert.equal(call.order[0], "created_at");
    assert.equal(call.order[1].ascending, false);
    assert.equal(call.limit, 50);
  }
  assert.equal(errors.length, 0);
});

test("legacy schema with no approved wishes returns an empty list", async () => {
  const { GET } = route([{ data: null, error: missingSide }, { data: [], error: null }]);
  assert.deepEqual(await (await GET()).json(), { data: [] });
});

test("unrelated database failures and failed fallback remain errors", async () => {
  for (const error of [
    { code: "42501", message: "permission denied" },
    { code: "42703", message: "column public_wishes.message does not exist" },
  ]) {
    const { GET, calls } = route([{ data: null, error }]);
    const response = await GET();
    assert.equal(response.status, 500);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(calls.length, 1);
    assert.deepEqual(await response.json(), { error: "Không thể tải lời chúc." });
  }
  const { GET, calls } = route([
    { data: null, error: missingSide },
    { data: null, error: { code: "42501", message: "permission denied" } },
  ]);
  assert.equal((await GET()).status, 500);
  assert.equal(calls.length, 2);
});
