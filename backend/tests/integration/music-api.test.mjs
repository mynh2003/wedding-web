import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import os from "node:os";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { generateMusicManifest } from "../../scripts/music-manifest.mjs";

const require = createRequire(import.meta.url);
function requireModule(name) {
  if (name === "@/lib/music-catalog.generated.json") return JSON.parse(fs.readFileSync("backend/lib/music-catalog.generated.json", "utf8"));
  return require(name);
}
function load(file, env = {}, extras = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(source, { exports, require: requireModule, URL, process: { env, cwd: () => process.cwd() }, ...extras });
  return exports;
}

test("music API selects an existing MP3 and avoids the previous track", async () => {
  const publicRoot = fs.existsSync("frontend/public") ? "frontend/public" : "public";
  const { GET } = load("backend/app/api/music/route.ts", { WEDDING_PUBLIC_DIR: path.resolve(publicRoot) });
  const first = await GET(new Request("http://localhost/api/music"));
  assert.equal(first.status, 200);
  assert.match(first.headers.get("cache-control"), /no-store/);
  const { track } = await first.json();
  assert.ok(track.title);
  const bytes = fs.readFileSync(`${publicRoot}${decodeURIComponent(track.src)}`);
  assert.ok(bytes.length > 1024);
  assert.ok(bytes.toString("ascii", 0, 3) === "ID3" || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0));
  const second = await GET(new Request(`http://localhost/api/music?previous=${encodeURIComponent(track.src)}`));
  assert.notEqual((await second.json()).track.src, track.src);
});

test("music API supports a separate asset directory and handles missing music safely", async () => {
  let directory;
  const { GET } = load("backend/app/api/music/route.ts", { WEDDING_PUBLIC_DIR: "D:/invitation-assets" }, {
    require(name) {
      if (name === "node:fs/promises") return { async readdir(value) {
        directory = value;
        throw Object.assign(new Error("private filesystem path"), { code: "ENOENT" });
      } };
      return requireModule(name);
    },
  });
  const response = await GET(new Request("http://localhost/api/music"));
  assert.equal(directory.replaceAll("\\", "/"), "D:/invitation-assets/music");
  assert.equal(response.status, 404);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.deepEqual(await response.json(), { error: "Chưa có bài hát." });
});

test("music API does not expose filesystem errors", async () => {
  const { GET } = load("backend/app/api/music/route.ts", { WEDDING_PUBLIC_DIR: "D:/invitation-assets" }, {
    require(name) {
      if (name === "node:fs/promises") return { async readdir() { throw new Error("private filesystem path"); } };
      return requireModule(name);
    },
  });
  const response = await GET(new Request("http://localhost/api/music"));
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Không thể tải bài hát." });
});

test("production music uses the bundled catalog without access to the frontend filesystem", async () => {
  const { GET } = load("backend/app/api/music/route.ts", { NODE_ENV: "production" }, {
    process: { env: { NODE_ENV: "production" }, cwd() { throw new Error("No project filesystem on serverless"); } },
    require(name) {
      if (name === "@/lib/music-catalog.generated.json") return ["hon-ca-yeu.mp3", "our_song.MP3"];
      if (name === "node:fs/promises") return { readdir() { throw new Error("Production must not scan files"); } };
      return requireModule(name);
    },
  });
  const response = await GET(new Request("https://api.example/api/music?previous=%2Fmusic%2Four_song.MP3"));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.deepEqual(await response.json(), { track: { title: "Hơn cả yêu", src: "/music/hon-ca-yeu.mp3" } });
  const next = await GET(new Request("https://api.example/api/music?previous=%2Fmusic%2Fhon-ca-yeu.mp3"));
  assert.deepEqual(await next.json(), { track: { title: "Our song", src: "/music/our_song.MP3" } });
});

test("production music returns an explicit unavailable response for an empty bundled catalog", async () => {
  const { GET } = load("backend/app/api/music/route.ts", { NODE_ENV: "production" }, {
    require(name) {
      if (name === "@/lib/music-catalog.generated.json") return [];
      return requireModule(name);
    },
  });
  const response = await GET(new Request("https://api.example/api/music"));
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "Chưa có bài hát." });
});

test("build music manifest includes only MP3 files, refreshes changes and avoids rewriting unchanged catalogs", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "wedding-music-manifest-"));
  try {
    const music = path.join(root, "frontend", "public", "music");
    const manifest = path.join(root, "backend", "lib", "music-catalog.generated.json");
    fs.mkdirSync(path.join(music, "folder.mp3"), { recursive: true });
    fs.writeFileSync(path.join(music, "README.md"), "Music");
    fs.writeFileSync(path.join(music, "b-song.MP3"), "audio");
    fs.writeFileSync(path.join(music, "a-song.mp3"), "audio");
    assert.deepEqual(await generateMusicManifest(root), ["a-song.mp3", "b-song.MP3"]);
    assert.deepEqual(JSON.parse(fs.readFileSync(manifest, "utf8")), ["a-song.mp3", "b-song.MP3"]);

    const previousTime = new Date("2020-01-01T00:00:00Z");
    fs.utimesSync(manifest, previousTime, previousTime);
    await generateMusicManifest(root);
    assert.equal(fs.statSync(manifest).mtimeMs, previousTime.getTime());

    fs.unlinkSync(path.join(music, "a-song.mp3"));
    fs.writeFileSync(path.join(music, "c-song.mp3"), "audio");
    await generateMusicManifest(root);
    assert.deepEqual(JSON.parse(fs.readFileSync(manifest, "utf8")), ["b-song.MP3", "c-song.mp3"]);
  } finally {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith("wedding-music-manifest-"));
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("development public API follows the current host while production keeps its backend origin", async () => {
  for (const [env, expected] of [
    [{ NODE_ENV: "development", NEXT_PUBLIC_SITE_URL: "http://192.168.1.103:3000", NEXT_PUBLIC_API_URL: "http://192.168.1.103:3000" }, "/api/wishes"],
    [{ NODE_ENV: "development", NEXT_PUBLIC_SITE_URL: "http://localhost:3000", NEXT_PUBLIC_API_URL: "http://localhost:3001" }, "/api/wishes"],
    [{ NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://invite.example", NEXT_PUBLIC_API_URL: "https://api.example" }, "https://api.example/api/wishes"],
  ]) {
    const { publicApiFetch } = load("frontend/lib/http/public-api.ts", env, { fetch: async (url, options) => {
      assert.equal(url, expected);
      assert.equal(options.credentials, "omit");
    } });
    await publicApiFetch("/api/wishes");
  }
});
