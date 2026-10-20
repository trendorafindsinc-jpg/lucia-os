import { NextRequest, NextResponse } from "next/server";

const PLATFORM_HOSTS = new Set([
  "lucia.name.ng",
  "www.lucia.name.ng",
  "os.lucia.name.ng",
  "lucia-os.vercel.app",
]);

function isPlatformHost(hostname: string): boolean {
  if (PLATFORM_HOSTS.has(hostname) || hostname.endsWith(".vercel.app")) return true;
  const configured = process.env.APP_BASE_URL;
  if (configured) {
    try {
      if (new URL(configured).hostname.toLowerCase() === hostname) return true;
    } catch {
      // Invalid deployment configuration must not disable exact-host DB checks.
    }
  }
  return false;
}

export function middleware(request: NextRequest) {
  const hostname = request.nextUrl.hostname.toLowerCase();
  if (isPlatformHost(hostname)) return NextResponse.next();

  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/_next/") || pathname === "/favicon.ico" || pathname === "/robots.txt") {
    return NextResponse.next();
  }

  // Customer hostnames never get access to the product's private API or auth routes.
  if (pathname.startsWith("/api/") || pathname.startsWith("/site/")) {
    return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const url = request.nextUrl.clone();
  url.pathname = pathname === "/" ? "/__tenant-site" : `/__tenant-site${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
