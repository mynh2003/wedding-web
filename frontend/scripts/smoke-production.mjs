import { serverRequest } from "../lib/http/server-request.mjs";

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const apiUrl = (process.env.SMOKE_API_URL ?? "http://localhost:3001").replace(/\/$/, "");
const frontendOrigin = process.env.SMOKE_FRONTEND_ORIGIN ?? baseUrl;

function request(path, options = {}, origin = baseUrl) {
  const headers = new Headers(options.headers);
  const host = origin === apiUrl ? process.env.SMOKE_API_HOST : process.env.SMOKE_FRONTEND_HOST;
  if (host) headers.set("Host", host);
  return serverRequest(`${origin}${path}`, { signal: AbortSignal.timeout(30_000), ...options, headers });
}

async function check(path, options = {}, origin = baseUrl) {
  const response = await request(path, options, origin);
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response;
}

const home = await check("/groom");
const homeHtml = await home.text();
const publicWedding = await (await check("/api/public/wedding", {}, apiUrl)).json();
if (publicWedding.data) {
  const escapeHtml = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;");
  if (!homeHtml.includes(escapeHtml(publicWedding.data.wedding.groom_name))) throw new Error("Frontend did not render the backend's published wedding data");
}
const health = await check("/api/health", {}, apiUrl);
const healthBody = await health.json();
if (healthBody.ok !== true) throw new Error("health endpoint is not healthy");
const music = await check("/api/music", {}, apiUrl);
const { track } = await music.json();
if (!track?.title || !/^\/music\/[^/]+\.mp3$/i.test(track.src)) throw new Error("music API returned an invalid track");
// Audio URLs are relative to the invitation origin, even with a separate API.
const audio = await check(track.src, { headers: { Range: "bytes=0-1023" } });
if (!audio.headers.get("content-type")?.startsWith("audio/")) throw new Error("music file is not served as audio");
if (!(await audio.arrayBuffer()).byteLength) throw new Error("music file is empty");
const unauthorized = await request("/api/admin/content", {}, apiUrl);
if (unauthorized.status !== 401) throw new Error(`admin API returned ${unauthorized.status} without a session`);
if (!home.headers.get("x-content-type-options")) throw new Error("security headers are missing");
if (home.headers.get("x-content-type-options") !== "nosniff") throw new Error("unexpected nosniff header");
if (apiUrl !== baseUrl) {
  for (const path of ["/api/health", "/api/admin/content", "/admin/login", "/auth/login"]) {
    const response = await request(path);
    if (response.status !== 404) throw new Error(`Frontend exposed ${path}: ${response.status}`);
  }
  if ((await request("/", {}, apiUrl)).status !== 404) throw new Error("Backend exposed invitation page");
  const preflight = await check("/api/wishes", { method: "OPTIONS", headers: {
    Origin: frontendOrigin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "Content-Type",
  } }, apiUrl);
  if (preflight.headers.get("access-control-allow-origin") !== frontendOrigin || preflight.headers.has("access-control-allow-credentials")) throw new Error("Public CORS policy is incorrect");
  const forbidden = await request("/api/admin/content", { headers: { Origin: frontendOrigin } }, apiUrl);
  if (forbidden.status !== 403) throw new Error("Frontend origin can access admin API");
}
console.log(`Smoke test passed: frontend ${baseUrl}, backend ${apiUrl}`);
