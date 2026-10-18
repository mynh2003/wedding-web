import "server-only";

import { NextRequest } from "next/server";

export function hasTrustedOrigin(request: NextRequest) {
  const siteUrl = process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return false;
  const isLoopback = (hostname: string) => hostname === "localhost" || hostname === "127.0.0.1";
  let trustedUrl: URL;
  try { trustedUrl = new URL(siteUrl); } catch { return false; }
  const requestHostname = (request.headers.get("host") ?? request.nextUrl.hostname).split(":")[0];
  // Local development may omit Origin/Referer in embedded browsers. Keep this
  // exception limited to loopback hosts; deployed domains still require origin checks.
  if (process.env.NODE_ENV !== "production" && !request.headers.get("origin") && !request.headers.get("referer") && isLoopback(trustedUrl.hostname) && isLoopback(requestHostname) && request.nextUrl.host === trustedUrl.host) return true;
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const candidate = origin ?? referer;
  if (!candidate) return false;
  try {
    const candidateUrl = new URL(candidate);
    return candidateUrl.origin === trustedUrl.origin;
  } catch { return false; }
}
