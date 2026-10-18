// Public calls never carry the administrator's backend cookies.
export function publicApiFetch(path: "/api/wishes" | "/api/music" | `/api/music?${string}`, init?: RequestInit) {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
  return fetch(`${base}${path}`, { ...init, credentials: "omit" });
}
