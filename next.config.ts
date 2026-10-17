import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: { cpus: 1 },
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Content-Security-Policy", value: "default-src 'self'; img-src 'self' data: https:; media-src 'self'; font-src 'self' https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self' 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
      ],
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
