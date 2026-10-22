// Public calls never carry the administrator's backend cookies.
export function publicApiFetch(path: "/api/wishes" | "/api/music" | `/api/music?${string}`, init?: RequestInit) {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
  // The frontend dev server forwards only public APIs to the separate backend.
  // Relative requests work through localhost and the current LAN IP alike.
  if (process.env.NODE_ENV === "development") {
    return fetch(path, { ...init, credentials: "omit" });
  }
  return fetch(`${base}${path}`, { ...init, credentials: "omit" });
}
