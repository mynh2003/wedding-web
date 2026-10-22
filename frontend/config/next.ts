import type { NextConfig } from "next";
import { deploymentConfig } from "../lib/deployment";

export function createAppConfig(role: "frontend" | "backend", appDirectory: string): NextConfig {
  process.env.APP_ROLE = role;
  if (process.env.NODE_ENV === "development") {
    process.env.NEXT_PUBLIC_SITE_URL ??= "http://localhost:3000";
    process.env.NEXT_PUBLIC_API_URL ??= "http://localhost:3001";
    process.env.BACKEND_INTERNAL_URL ??= "http://127.0.0.1:3001";
  }
  const deployment = deploymentConfig(process.env);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseStorageUrl = supabaseUrl ? new URL(supabaseUrl) : null;
  const supabaseOrigin = supabaseStorageUrl?.origin ?? "";
  const realtimeOrigin = supabaseOrigin.replace(/^http/, "ws");
  const connectSources = ["'self'", deployment.backendOrigin, supabaseOrigin, realtimeOrigin].filter(Boolean).join(" ");
  const scriptSources = process.env.NODE_ENV === "development" ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self' 'unsafe-inline'";

  const nextConfig: NextConfig = {
    // Allow production verification without overwriting an active dev build.
    distDir: process.env.NEXT_BUILD_DIR || (process.env.NODE_ENV === "development" ? ".next-dev" : ".next"),
    reactStrictMode: true,
    poweredByHeader: false,
    env: {
      APP_ROLE: role,
      // Leave room for multipart fields below Vercel's function payload limit.
      NEXT_PUBLIC_MAX_UPLOAD_MB: process.env.VERCEL === "1" ? "4" : "10",
    },
    outputFileTracingRoot: appDirectory,
    webpack(config, { dev }) {
      // Avoid restoring damaged disk packs during local/LAN development.
      // Keep production's build cache and optimizations unchanged.
      if (dev) config.cache = { type: "memory" };
      return config;
    },
    images: {
      remotePatterns: supabaseStorageUrl ? [{
        protocol: supabaseStorageUrl.protocol === "http:" ? "http" : "https",
        hostname: supabaseStorageUrl.hostname,
        port: supabaseStorageUrl.port,
        pathname: "/storage/v1/object/sign/wedding-private/**",
        // Signed URLs have a changing token query parameter.
      }] : [],
    },
    experimental: { cpus: 1 },
    async rewrites() {
      // LAN phones use the frontend's current host. Proxy only public endpoints
      // in dev; production and all admin/auth traffic stay on the backend origin.
      if (role !== "frontend" || process.env.NODE_ENV !== "development") return [];
      const backend = process.env.BACKEND_INTERNAL_URL ?? "http://127.0.0.1:3001";
      return ["/api/wishes", "/api/music", "/api/public/:path*"].map((source) => ({ source, destination: `${backend}${source}` }));
    },
    async headers() {
      return [{
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: `default-src 'self'; connect-src ${connectSources}; img-src 'self' data: https:; media-src 'self' blob:; font-src 'self' https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src ${scriptSources}; frame-ancestors 'none'; base-uri 'self'; form-action 'self'` },
        ],
      }, {
        source: "/font/browser/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      }, {
        source: "/admin/:path*",
        // Native form POSTs can get Origin: null under no-referrer.
        // Preserve same-origin form identity without sending referrers off-site.
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Referrer-Policy", value: "same-origin" },
        ],
      }, {
        source: "/auth/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }, { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      }, {
        source: "/api/admin/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }],
      }, {
        source: "/api/public/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }],
      }, {
        source: "/i/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }],
      }];
    },
  };

  return nextConfig;
}
