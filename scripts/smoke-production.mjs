const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const apiUrl = (process.env.SMOKE_API_URL ?? baseUrl).replace(/\/$/, "");

async function check(path, options = {}, origin = baseUrl) {
  const response = await fetch(`${origin}${path}`, { redirect: "manual", ...options });
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response;
}

const home = await check("/");
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
const unauthorized = await fetch(`${apiUrl}/api/admin/content`);
if (unauthorized.status !== 401) throw new Error(`admin API returned ${unauthorized.status} without a session`);
if (!home.headers.get("x-content-type-options")) throw new Error("security headers are missing");
if (home.headers.get("x-content-type-options") !== "nosniff") throw new Error("unexpected nosniff header");
if (apiUrl !== baseUrl) {
  for (const path of ["/api/health", "/api/admin/content", "/admin/login", "/auth/login"]) {
    const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
    if (response.status !== 404) throw new Error(`Frontend exposed ${path}: ${response.status}`);
  }
  if ((await fetch(`${apiUrl}/`, { redirect: "manual" })).status !== 404) throw new Error("Backend exposed invitation page");
  const preflight = await check("/api/wishes", { method: "OPTIONS", headers: {
    Origin: baseUrl, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "Content-Type",
  } }, apiUrl);
  if (preflight.headers.get("access-control-allow-origin") !== baseUrl || preflight.headers.has("access-control-allow-credentials")) throw new Error("Public CORS policy is incorrect");
  const forbidden = await fetch(`${apiUrl}/api/admin/content`, { headers: { Origin: baseUrl } });
  if (forbidden.status !== 403) throw new Error("Frontend origin can access admin API");
}
console.log(`Smoke test passed: frontend ${baseUrl}, backend ${apiUrl}`);
