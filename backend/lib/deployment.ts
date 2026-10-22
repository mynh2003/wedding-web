type Environment = Record<string, string | undefined>;

export function deploymentConfig(env: Environment) {
  const role = env.APP_ROLE ?? (env.NODE_ENV === "production" ? "" : "combined");
  if (!["frontend", "backend", "combined"].includes(role) || (env.NODE_ENV === "production" && role === "combined")) {
    throw new Error("Set APP_ROLE to frontend or backend for each production deployment.");
  }
  const frontend = new URL(env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
  const backend = new URL(env.NEXT_PUBLIC_API_URL ?? (role === "combined" ? frontend.origin : "http://localhost:3001"));
  for (const url of [frontend, backend]) {
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
      throw new Error("Application URLs must be HTTP(S) origins without paths or credentials.");
    }
    if (env.NODE_ENV === "production" && url.protocol !== "https:") throw new Error("Production origins must use HTTPS.");
  }
  if (role !== "combined" && frontend.origin === backend.origin) throw new Error("Frontend and backend must use different origins.");
  if (env.NODE_ENV === "production" && frontend.hostname === backend.hostname) throw new Error("Production frontend and backend must use different hostnames.");
  if (env.NODE_ENV === "production" && (!env.NEXT_PUBLIC_SITE_URL || !env.NEXT_PUBLIC_API_URL)) {
    throw new Error("Set NEXT_PUBLIC_SITE_URL and NEXT_PUBLIC_API_URL in production.");
  }
  return { role, frontendOrigin: frontend.origin, backendOrigin: backend.origin };
}

export function isBackendPath(path: string) {
  return /^\/(?:api|admin|auth)(?:\/|$)/.test(path);
}

export function isPublicApi(path: string) {
  return ["/api/wishes", "/api/music", "/api/public/content", "/api/public/media", "/api/public/wedding", "/api/public/invitation"].includes(path);
}

// Dev-only public API access from a phone on the same private network. Admin
// requests still require the backend's exact request origin, including port.
export function developmentFrontendOrigin(origin: string | null, frontend: string) {
  if (!origin) return frontend;
  try {
    const candidate = new URL(origin);
    const configured = new URL(frontend);
    const host = candidate.hostname;
    const privateHost = host === "localhost" || host === "127.0.0.1" || host === "[::1]" ||
      /^10\.\d+\.\d+\.\d+$/.test(host) || /^192\.168\.\d+\.\d+$/.test(host) || /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(host);
    return candidate.origin === origin && candidate.protocol === configured.protocol && candidate.port === configured.port && privateHost ? origin : frontend;
  } catch { return frontend; }
}

// Only the invitation's public API may be read across origins. Admin stays same-origin.
export function corsPolicy(path: string, origin: string | null, frontend: string, backend: string) {
  if (!origin) return "none";
  if (origin === backend) return "same-origin";
  if (origin === frontend && isPublicApi(path)) return "public";
  return "deny";
}
