import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(file, env, dependencies = {}, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const requireModule = (name) => {
    if (Object.hasOwn(dependencies, name)) return dependencies[name];
    if (["wedding-presentation", "dress-code", "invitation-copy", "section-images"].some((module) => name === `@/lib/${module}`)) {
      return load(`backend/lib/${name.slice("@/lib/".length)}.ts`, env);
    }
    return require(name);
  };
  vm.runInNewContext(source, { exports, URL, Headers, AbortSignal, process: { env }, require: requireModule, ...globals });
  return exports;
}

test("two app trees physically separate invitation and administration routes", () => {
  assert.ok(fs.existsSync("frontend/app/groom/page.tsx"));
  assert.ok(fs.existsSync("backend/app/admin/login/page.tsx"));
  assert.ok(!fs.existsSync("frontend/app/admin"));
  assert.ok(!fs.existsSync("frontend/app/api"));
  assert.ok(!fs.existsSync("backend/app/groom"));
  for (const app of ["frontend", "backend"]) {
    assert.ok(fs.existsSync(`${app}/package.json`));
    assert.ok(fs.existsSync(`${app}/next.config.ts`));
  }
  for (const dir of ["frontend/app", "frontend/components", "frontend/lib"]) {
    for (const file of fs.readdirSync(dir, { recursive: true }).filter((file) => /\.tsx?$/.test(file))) {
      const source = fs.readFileSync(`${dir}/${file}`, "utf8");
      assert.doesNotMatch(source, /from ["']@\/(?:backend|lib\/auth|lib\/supabase\/(?:server|public-server))[\/'"]/, file);
    }
  }
});

test("each application installs and builds without source outside its directory", () => {
  for (const role of ["frontend", "backend"]) {
    const pkg = JSON.parse(fs.readFileSync(`${role}/package.json`, "utf8"));
    const lock = JSON.parse(fs.readFileSync(`${role}/package-lock.json`, "utf8"));
    const config = JSON.parse(fs.readFileSync(`${role}/tsconfig.json`, "utf8"));
    assert.equal(lock.packages[""].name, pkg.name);
    assert.deepEqual(lock.packages[""].dependencies, pkg.dependencies);
    assert.equal(pkg.scripts.build, "next build");
    assert.deepEqual(config.compilerOptions.paths, { "@/*": ["./*"] });
    assert.equal(JSON.parse(fs.readFileSync(`${role}/vercel.json`, "utf8")).installCommand, "npm ci --include=dev");
    for (const entry of fs.readdirSync(role, { recursive: true, withFileTypes: true })) {
      if (!entry.isFile() || !/\.(?:tsx?|mjs)$/.test(entry.name)) continue;
      const file = `${entry.parentPath}/${entry.name}`;
      if (/[/\\](?:node_modules|\.next[^/\\]*)[/\\]/.test(file)) continue;
      const source = fs.readFileSync(file, "utf8");
      assert.doesNotMatch(source, /@\/(?:frontend|backend)\//, file);
      // Resolve every literal relative import, including configuration files.
      for (const match of source.matchAll(/(?:from\s*|import\s*\(|require\s*\()\s*["'](\.[^"']+)["']/g)) {
        const target = new URL(match[1], `file:///${fs.realpathSync(file).replaceAll("\\", "/")}`);
        const appRoot = new URL(`file:///${fs.realpathSync(role).replaceAll("\\", "/")}/`);
        assert.ok(target.href.startsWith(appRoot.href), `${file} imports ${match[1]}`);
      }
    }
  }
});

test("dev proxies public APIs only; production has no frontend API proxy", async () => {
  for (const NODE_ENV of ["development", "production"]) {
    const env = { NODE_ENV, NEXT_PUBLIC_SITE_URL: "https://invite.example", NEXT_PUBLIC_API_URL: "https://admin.example.net" };
    const deployment = load("backend/lib/deployment.ts", env);
    const { createAppConfig } = load("frontend/config/next.ts", env, { "../lib/deployment": deployment });
    const frontend = createAppConfig("frontend", "/workspace/frontend");
    const rewrites = await frontend.rewrites();
    assert.equal(rewrites.length, NODE_ENV === "development" ? 3 : 0);
    assert.ok(rewrites.every((rule) => !/admin|auth/.test(rule.source)));
    assert.equal((await createAppConfig("backend", "/workspace/backend").rewrites()).length, 0);
  }
});

test("frontend SSR uses one cookie-free backend request per render and preserves canonical Host", async () => {
  const requests = [];
  const env = { NEXT_PUBLIC_API_URL: "https://management.example.net", BACKEND_INTERNAL_URL: "http://127.0.0.1:3401" };
  const client = load("frontend/lib/wedding-data.ts", env, {
    "server-only": {}, react: { cache(fn) { const memo = new Map(); return (key) => { if (!memo.has(key)) memo.set(key, fn(key)); return memo.get(key); }; } },
    "@/lib/http/server-request.mjs": { serverRequest: async (url, init) => { requests.push({ url, init }); return new Response(JSON.stringify({ data: { wedding: { id: "public" } }, presentation: { groomName: "From backend" } })); } },
  }, { fetch: () => { throw new Error("Native fetch must not be used for internal Host overrides."); } });
  const [a, b, presentation] = await Promise.all([client.getPublicWedding("slug"), client.getPublicWedding("slug"), client.getWeddingPresentation("slug")]);
  assert.deepEqual(a, b);
  assert.equal(presentation.groomName, "From backend");
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "http://127.0.0.1:3401/api/public/wedding?slug=slug");
  assert.ok(requests[0].init.signal instanceof AbortSignal);
  assert.equal(requests[0].init.headers.get("host"), "management.example.net");
  assert.equal(requests[0].init.headers.get("cookie"), null);
  await client.resolveInvitation("a".repeat(64));
  assert.equal(requests[1].init.method, "POST");
  assert.equal(requests[1].init.body, JSON.stringify({ tokenHash: "a".repeat(64) }));
  assert.ok(!requests[1].url.includes("a".repeat(64)));
});

test("LAN backend login stays same-origin while frontend cannot post to admin", () => {
  const env = { NODE_ENV: "development", APP_ROLE: "backend", NEXT_PUBLIC_SITE_URL: "http://localhost:3000", NEXT_PUBLIC_API_URL: "http://localhost:3001" };
  const { NextRequest } = require("next/server");
  const { hasTrustedOrigin, getAuthOrigin } = load("backend/lib/auth/origin.ts", env, { "server-only": {} });
  const request = (origin) => new NextRequest("http://0.0.0.0:3001/auth/login", { headers: { host: "192.168.1.100:3001", origin } });
  assert.equal(getAuthOrigin(request("http://192.168.1.100:3001")), "http://192.168.1.100:3001");
  assert.equal(hasTrustedOrigin(request("http://192.168.1.100:3001")), true);
  assert.equal(hasTrustedOrigin(request("http://192.168.1.100:3000")), false);
});
