import assert from "node:assert/strict";
import { networkInterfaces } from "node:os";

const frontendPort = process.env.FRONTEND_PORT ?? "3000";
const backendPort = process.env.BACKEND_PORT ?? "3001";
const lan = Object.values(networkInterfaces()).flat().find((entry) => entry && !entry.internal && entry.family === "IPv4" && /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(entry.address))?.address;
const hosts = ["localhost", ...(lan ? [lan] : [])];

for (const host of hosts) {
  const frontend = `http://${host}:${frontendPort}`;
  const backend = `http://${host}:${backendPort}`;
  const request = (origin, route, init = {}) => fetch(`${origin}${route}`, { ...init, redirect: "manual", signal: AbortSignal.timeout(90_000) });
  const home = await request(frontend, "/groom");
  assert.equal(home.status, 200, "groom invitation");
  assert.match(await home.text(), /<html/);
  assert.equal((await request(frontend, "/bride")).status, 200, "bride invitation");
  assert.equal((await request(backend, "/api/health")).status, 200, "backend health");
  const data = await request(backend, "/api/public/wedding");
  assert.equal(data.status, 200, "published wedding API");
  const music = await request(frontend, "/api/music");
  assert.equal(music.status, 200, "frontend music proxy");
  const { track } = await music.json();
  const audio = await request(frontend, track.src, { headers: { Range: "bytes=0-1023" } });
  assert.equal(audio.status, 206, "streaming music");
  assert.ok(audio.headers.get("content-type")?.startsWith("audio/"));
  assert.ok((await audio.arrayBuffer()).byteLength > 0);
  const preflight = await request(backend, "/api/wishes", {
    method: "OPTIONS", headers: { Origin: frontend, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type" },
  });
  assert.equal(preflight.status, 204, "public CORS");
  assert.equal(preflight.headers.get("access-control-allow-origin"), frontend);
  const login = await request(backend, "/admin/login");
  assert.equal(login.status, 200, "admin login page");
  assert.match(await login.text(), /<form/);
  const blankLogin = await request(backend, "/auth/login", {
    method: "POST", headers: { Origin: backend, "Content-Type": "application/x-www-form-urlencoded" }, body: "email=&password=",
  });
  assert.equal(blankLogin.status, 303, "invalid login redirects instead of Forbidden");
  assert.equal(new URL(blankLogin.headers.get("location")).origin, backend, "login preserves LAN origin");
  assert.equal((await request(backend, "/api/admin/content")).status, 401, "admin requires authentication");
  assert.equal((await request(frontend, "/admin/login")).status, 404, "admin belongs to backend");
  console.log(`Development checks passed: ${frontend} and ${backend}`);
}
