import { NextResponse, type NextRequest } from "next/server";
import { deploymentConfig, isBackendPath, isPublicApi } from "@/lib/deployment";

export function middleware(request: NextRequest) {
  const deployment = deploymentConfig({
    NODE_ENV: process.env.NODE_ENV,
    APP_ROLE: process.env.APP_ROLE,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  });
  const path = request.nextUrl.pathname;
  if (process.env.NODE_ENV === "production") {
    const host = request.headers.get("host") ?? request.nextUrl.host;
    if (host !== new URL(deployment.frontendOrigin).host) return new NextResponse("Not found", { status: 404 });
  }
  const devPublicProxy = process.env.NODE_ENV === "development" && isPublicApi(path);
  if (isBackendPath(path) && !devPublicProxy) return new NextResponse("Not found", { status: 404 });
  return NextResponse.next();
}
export const config = { matcher: ["/api/:path*", "/admin/:path*", "/auth/:path*", "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3)$).*)"] };
