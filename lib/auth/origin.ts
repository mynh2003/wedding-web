import "server-only";

import { NextRequest } from "next/server";

export function hasTrustedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!origin || !siteUrl) return false;
  try { return new URL(origin).origin === new URL(siteUrl).origin; } catch { return false; }
}
