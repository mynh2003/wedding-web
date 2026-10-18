import type { NextConfig } from "next";
import { deploymentConfig } from "./lib/deployment";

const deployment = deploymentConfig(process.env);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseStorageUrl = supabaseUrl ? new URL(supabaseUrl) : null;
const supabaseOrigin = supabaseStorageUrl?.origin ?? "";
const realtimeOrigin = supabaseOrigin.replace(/^http/, "ws");
const connectSources = ["'self'", deployment.backendOrigin, supabaseOrigin, realtimeOrigin].filter(Boolean).join(" ");

const nextConfig: NextConfig = {
  // Allow production verification without overwriting an active dev build.
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  reactStrictMode: true,
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
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Content-Security-Policy", value: `default-src 'self'; connect-src ${connectSources}; img-src 'self' data: https:; media-src 'self'; font-src 'self' https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self' 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'` },
      ],
    }, {
      source: "/font/browser/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    }, {
      source: "/admin/:path*",
      headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }],
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

export default nextConfig;
