import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(file, env = {}, extras = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(source, { exports, require, URL, process: { env, cwd: () => process.cwd() }, ...extras });
  return exports;
}

test("music API selects an existing MP3 and avoids the previous track", async () => {
  const { GET } = load("app/api/music/route.ts");
  const first = await GET(new Request("http://localhost/api/music"));
  assert.equal(first.status, 200);
  assert.match(first.headers.get("cache-control"), /no-store/);
  const { track } = await first.json();
  assert.ok(track.title);
  const bytes = fs.readFileSync(`public${decodeURIComponent(track.src)}`);
  assert.ok(bytes.length > 1024);
  assert.ok(bytes.toString("ascii", 0, 3) === "ID3" || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0));
  const second = await GET(new Request(`http://localhost/api/music?previous=${encodeURIComponent(track.src)}`));
  assert.notEqual((await second.json()).track.src, track.src);
});

test("combined local API follows the current host while split API keeps its origin", async () => {
  for (const [env, expected] of [
    [{ NODE_ENV: "development", NEXT_PUBLIC_SITE_URL: "http://192.168.1.103:3000", NEXT_PUBLIC_API_URL: "http://192.168.1.103:3000" }, "/api/wishes"],
    [{ NODE_ENV: "development", NEXT_PUBLIC_SITE_URL: "http://localhost:3000", NEXT_PUBLIC_API_URL: "http://localhost:3001" }, "http://localhost:3001/api/wishes"],
    [{ NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://invite.example", NEXT_PUBLIC_API_URL: "https://api.example" }, "https://api.example/api/wishes"],
  ]) {
    const { publicApiFetch } = load("lib/http/public-api.ts", env, { fetch: async (url, options) => {
      assert.equal(url, expected);
      assert.equal(options.credentials, "omit");
    } });
    await publicApiFetch("/api/wishes");
  }
});
