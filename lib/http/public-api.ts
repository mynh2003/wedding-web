// Public calls never carry the administrator's backend cookies.
export function publicApiFetch(path: "/api/wishes" | "/api/music" | `/api/music?${string}`, init?: RequestInit) {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  // Combined local development may be opened through localhost or a LAN IP.
  // Keep both on the current origin; production split deployments stay explicit.
  if (process.env.NODE_ENV === "development" && base === site) {
    return fetch(path, { ...init, credentials: "omit" });
  }
  return fetch(`${base}${path}`, { ...init, credentials: "omit" });
}
