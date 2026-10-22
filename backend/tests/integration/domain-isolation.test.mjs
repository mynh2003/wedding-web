import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { NextRequest, NextResponse } = require("next/server");
function load(file, env, dependencies = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports, URL, URLSearchParams, TextDecoder, process: { env },
    require: (name) => dependencies[name] ?? (name === "server-only" ? {} : name === "@/lib/security/rate-limit" ? { limitRequest: async () => null } : name === "@/lib/http/body" ? load("backend/lib/http/body.ts", env) : require(name)),
  });
  return exports;
}
const env = { NODE_ENV: "production", APP_ROLE: "backend", NEXT_PUBLIC_SITE_URL: "https://invitation.example", NEXT_PUBLIC_API_URL: "https://management.example.net" };
const policy = load("backend/lib/deployment.ts", env);
function middleware(role = "backend") {
  return load(`${role}/middleware.ts`, { ...env, APP_ROLE: role }, {
    "@/lib/deployment": policy,
    "@/lib/supabase/proxy": { updateSession: async () => NextResponse.next() },
  }).middleware;
}

test("production requires separate explicit HTTPS origins and deployment roles", () => {
  for (const invalid of [
    { APP_ROLE: undefined }, { APP_ROLE: "combined" }, { NEXT_PUBLIC_API_URL: undefined },
    { NEXT_PUBLIC_API_URL: env.NEXT_PUBLIC_SITE_URL }, { NEXT_PUBLIC_API_URL: "http://api.example" },
    { NEXT_PUBLIC_API_URL: "https://invitation.example:8443" },
    { NEXT_PUBLIC_API_URL: "https://api.example/path" }, { NEXT_PUBLIC_API_URL: "https://user:pass@api.example" },
  ]) assert.throws(() => policy.deploymentConfig({ ...env, ...invalid }));
  assert.equal(policy.deploymentConfig(env).role, "backend");
  assert.equal(policy.deploymentConfig({}).role, "combined");
});

test("frontend refuses API, admin and auth, including extension-shaped paths", async () => {
  for (const path of ["/api/wishes", "/api/admin/guests/x.png", "/admin/login", "/auth/login"]) {
    const response = await middleware("frontend")(new NextRequest(`${env.NEXT_PUBLIC_SITE_URL}${path}`));
    assert.equal(response.status, 404);
  }
  assert.equal((await middleware("frontend")(new NextRequest(`${env.NEXT_PUBLIC_SITE_URL}/bride`))).status, 200);
});

test("backend refuses invitation pages and unexpected host aliases", async () => {
  for (const url of [`${env.NEXT_PUBLIC_API_URL}/`, `${env.NEXT_PUBLIC_API_URL}/i/private-token`, "https://alias.example/api/wishes"]) {
    assert.equal((await middleware()(new NextRequest(url))).status, 404);
  }
});

test("canonical Host works when Next uses an internal listen URL", async () => {
  const response = await middleware()(new NextRequest("http://localhost:3101/api/health", { headers: { host: "management.example.net" } }));
  assert.equal(response.status, 200);
  const alias = await middleware()(new NextRequest(`${env.NEXT_PUBLIC_API_URL}/api/health`, { headers: { host: "alias.example" } }));
  assert.equal(alias.status, 404);
});

test("public API preflight allows exact frontend origin without credentials", async () => {
  const response = await middleware()(new NextRequest(`${env.NEXT_PUBLIC_API_URL}/api/wishes`, {
    method: "OPTIONS", headers: { origin: env.NEXT_PUBLIC_SITE_URL, "access-control-request-method": "POST", "access-control-request-headers": "content-type" },
  }));
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), env.NEXT_PUBLIC_SITE_URL);
  assert.equal(response.headers.get("access-control-allow-credentials"), null);
});

test("CORS rejects hostile origins, admin cross-origin access, methods and headers", async () => {
  for (const [path, origin, method, header] of [
    ["/api/wishes", "https://invitation.example.evil.test", "POST", "content-type"],
    ["/api/admin/content", env.NEXT_PUBLIC_SITE_URL, "GET", ""],
    ["/api/wishes", env.NEXT_PUBLIC_SITE_URL, "DELETE", "content-type"],
    ["/api/music", env.NEXT_PUBLIC_SITE_URL, "POST", ""],
    ["/api/wishes", env.NEXT_PUBLIC_SITE_URL, "POST", "authorization"],
  ]) {
    const response = await middleware()(new NextRequest(`${env.NEXT_PUBLIC_API_URL}${path}`, {
      method: "OPTIONS", headers: { origin, "access-control-request-method": method, "access-control-request-headers": header },
    }));
    assert.equal(response.status, 403);
    assert.equal(response.headers.get("access-control-allow-origin"), null);
  }
});

test("actual public responses expose CORS while admin stays same-origin", async () => {
  const response = await middleware()(new NextRequest(`${env.NEXT_PUBLIC_API_URL}/api/wishes`, { headers: { origin: env.NEXT_PUBLIC_SITE_URL } }));
  assert.equal(response.headers.get("access-control-allow-origin"), env.NEXT_PUBLIC_SITE_URL);
  assert.match(response.headers.get("vary"), /Origin/);
  assert.equal((await middleware()(new NextRequest(`${env.NEXT_PUBLIC_API_URL}/auth/login`, { method: "POST", headers: { origin: env.NEXT_PUBLIC_SITE_URL } }))).status, 403);
  assert.equal((await middleware()(new NextRequest(`${env.NEXT_PUBLIC_API_URL}/admin/login`))).status, 200);
});

test("admin CSRF origin is the backend, never the invitation frontend", () => {
  const { hasTrustedOrigin } = load("backend/lib/auth/origin.ts", env, { "server-only": {} });
  for (const origin of [env.NEXT_PUBLIC_SITE_URL, "https://evil.example", "null"]) {
    assert.equal(hasTrustedOrigin(new NextRequest(`${env.NEXT_PUBLIC_API_URL}/auth/login`, { headers: { origin } })), false);
  }
  assert.equal(hasTrustedOrigin(new NextRequest(`${env.NEXT_PUBLIC_API_URL}/auth/login`, { headers: { origin: env.NEXT_PUBLIC_API_URL } })), true);
  assert.equal(hasTrustedOrigin(new NextRequest(`${env.NEXT_PUBLIC_API_URL}/auth/login`)), false);
});

test("split local development still isolates admin by port", () => {
  const { hasTrustedOrigin } = load("backend/lib/auth/origin.ts", { NODE_ENV: "development", NEXT_PUBLIC_SITE_URL: "http://localhost:3000", NEXT_PUBLIC_API_URL: "http://localhost:3001" }, { "server-only": {} });
  assert.equal(hasTrustedOrigin(new NextRequest("http://localhost:3001/auth/login", { headers: { origin: "http://localhost:3000" } })), false);
  assert.equal(hasTrustedOrigin(new NextRequest("http://localhost:3000/auth/login")), false);
  assert.equal(hasTrustedOrigin(new NextRequest("http://localhost:3001/auth/login")), true);
});

test("combined development supports localhost and LAN admin without crossing origins", async () => {
  const localEnv = { NODE_ENV: "development", NEXT_PUBLIC_SITE_URL: "http://192.168.1.103:3000", NEXT_PUBLIC_API_URL: "http://192.168.1.103:3000" };
  const origin = load("backend/lib/auth/origin.ts", localEnv, { "server-only": {} });
  const { POST } = load("backend/app/auth/login/route.ts", localEnv, {
    "@/lib/auth/origin": origin,
    "@/lib/supabase/server": { createClient: () => { throw new Error("Empty credentials must not reach Supabase"); } },
  });
  const localMiddleware = load("backend/middleware.ts", localEnv, {
    "@/lib/deployment": policy,
    "@/lib/supabase/proxy": { updateSession: async () => NextResponse.next() },
  }).middleware;
  for (const host of ["localhost:3000", "127.0.0.1:3000", "192.168.1.103:3000"]) {
    const request = new NextRequest("http://0.0.0.0:3000/auth/login", {
      method: "POST", headers: { host, origin: `http://${host}`, "content-type": "application/x-www-form-urlencoded" }, body: "email=&password=",
    });
    assert.equal(origin.hasTrustedOrigin(request), true);
    assert.equal((await localMiddleware(request)).status, 200);
    assert.equal((await POST(request)).headers.get("location"), `http://${host}/admin/login?error=invalid`);
    assert.equal(origin.hasTrustedOrigin(new NextRequest(`http://${host}/auth/login`, { headers: { host, origin: "http://evil.example" } })), false);
    assert.equal((await localMiddleware(new NextRequest(`http://${host}/admin/login`, { headers: { host } }))).status, 200);
  }
});

test("login redirects stay on the configured HTTPS backend behind a proxy", async () => {
  const origin = load("backend/lib/auth/origin.ts", env, { "server-only": {} });
  const { POST } = load("backend/app/auth/login/route.ts", env, {
    "@/lib/auth/origin": origin,
    "@/lib/supabase/server": { createClient: () => { throw new Error("Empty credentials must not reach Supabase"); } },
  });
  const response = await POST(new NextRequest("http://localhost:3101/auth/login", {
    method: "POST", headers: { host: "management.example.net", origin: env.NEXT_PUBLIC_API_URL, "content-type": "application/x-www-form-urlencoded" }, body: "email=&password=",
  }));
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), `${env.NEXT_PUBLIC_API_URL}/admin/login?error=invalid`);
});

test("successful LAN admin login returns to the LAN dashboard", async () => {
  const localEnv = { NODE_ENV: "development", NEXT_PUBLIC_SITE_URL: "http://localhost:3000" };
  const origin = load("backend/lib/auth/origin.ts", localEnv, { "server-only": {} });
  const query = { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: { user_id: "admin" } }; } };
  const { POST } = load("backend/app/auth/login/route.ts", localEnv, {
    "@/lib/auth/origin": origin,
    "@/lib/supabase/server": { createClient: async () => ({
      auth: { signInWithPassword: async () => ({ error: null }), getUser: async () => ({ data: { user: { id: "admin", email_confirmed_at: "2026-10-19" } } }) },
      from: () => query,
    }) },
  });
  const response = await POST(new NextRequest("http://0.0.0.0:3000/auth/login", {
    method: "POST", headers: { host: "192.168.1.100:3000", origin: "http://192.168.1.100:3000", "content-type": "application/x-www-form-urlencoded" },
    body: "email=test%40example.com&password=test-only",
  }));
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "http://192.168.1.100:3000/admin");
});
