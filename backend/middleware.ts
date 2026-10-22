import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { corsPolicy, deploymentConfig, developmentFrontendOrigin, isBackendPath } from "@/lib/deployment";

export async function middleware(request: NextRequest) {
  const deployment = deploymentConfig({
    NODE_ENV: process.env.NODE_ENV,
    APP_ROLE: process.env.APP_ROLE,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  });
  const path = request.nextUrl.pathname;
  if (deployment.role !== "combined") {
    const expected = deployment.role === "frontend" ? deployment.frontendOrigin : deployment.backendOrigin;
    // Next may construct nextUrl using the internal listen address behind a proxy.
    const host = request.headers.get("host") ?? request.nextUrl.host;
    if (process.env.NODE_ENV === "production" && host !== new URL(expected).host) return new NextResponse("Not found", { status: 404 });
    const devPublicProxy = process.env.NODE_ENV === "development" && (path === "/api/music" || path === "/api/wishes" || path.startsWith("/api/public/"));
    if (deployment.role === "frontend" && isBackendPath(path) && !devPublicProxy) return new NextResponse("Not found", { status: 404 });
    if (deployment.role === "backend" && !isBackendPath(path) && !path.startsWith("/_next/")) {
      return new NextResponse("Not found", { status: 404 });
    }
  }
  const localServer = process.env.NODE_ENV === "development";
  const backendOrigin = localServer
    ? `${request.nextUrl.protocol}//${request.headers.get("host") ?? request.nextUrl.host}`
    : deployment.backendOrigin;
  const frontendOrigin = localServer ? developmentFrontendOrigin(request.headers.get("origin"), deployment.frontendOrigin) : deployment.frontendOrigin;
  const policy = corsPolicy(path, request.headers.get("origin"), frontendOrigin, backendOrigin);
  if (isBackendPath(path) && policy === "deny") return new NextResponse("Forbidden", { status: 403 });
  if (request.method === "OPTIONS" && path.startsWith("/api/")) {
    const method = request.headers.get("access-control-request-method") ?? "GET";
    const allowed = path === "/api/wishes" ? ["GET", "POST"] : path === "/api/public/invitation" ? ["POST"] : ["GET"];
    const requestedHeaders = (request.headers.get("access-control-request-headers") ?? "").split(",").map((header) => header.trim().toLowerCase()).filter(Boolean);
    if (policy !== "public" || !allowed.includes(method) || requestedHeaders.some((header) => header !== "content-type")) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    return new NextResponse(null, { status: 204, headers: {
      "Access-Control-Allow-Origin": frontendOrigin,
      "Access-Control-Allow-Methods": allowed.join(", "),
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin, Access-Control-Request-Method, Access-Control-Request-Headers",
    } });
  }
  // Public pages/API do not need an admin session or refreshed admin cookies.
  const needsSession = /^\/(?:admin|auth)(?:\/|$)/.test(path) || path.startsWith("/api/admin/");
  const response = needsSession ? await updateSession(request) : NextResponse.next();
  if (policy === "public") {
    response.headers.set("Access-Control-Allow-Origin", frontendOrigin);
    response.headers.append("Vary", "Origin");
  }
  return response;
}

export const config = {
  matcher: ["/api/:path*", "/admin/:path*", "/auth/:path*", "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3)$).*)"],
};
