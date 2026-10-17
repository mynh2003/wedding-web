const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

async function check(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual", ...options });
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response;
}

const home = await check("/");
const health = await check("/api/health");
const healthBody = await health.json();
if (healthBody.ok !== true) throw new Error("health endpoint is not healthy");
const unauthorized = await fetch(`${baseUrl}/api/admin/content`);
if (unauthorized.status !== 401) throw new Error(`admin API returned ${unauthorized.status} without a session`);
if (!home.headers.get("x-content-type-options")) throw new Error("security headers are missing");
if (home.headers.get("x-content-type-options") !== "nosniff") throw new Error("unexpected nosniff header");
console.log(`Smoke test passed: ${baseUrl}`);
