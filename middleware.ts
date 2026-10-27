import { NextRequest, NextResponse } from "next/server";
import { resolveLuciaSubdomain } from "@/lib/publishing/host";

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
  const pathname = request.nextUrl.pathname;

  // Route customer subdomains before the platform-host bypass. Reserved names
  // (including "os" and "staff") are excluded by resolveLuciaSubdomain.
  const siteDomain = process.env.LUCIA_SITE_DOMAIN || "lucia.name.ng";
  const siteSlug = resolveLuciaSubdomain(request.headers.get("host"), siteDomain);
  if (siteSlug) {
    if (pathname.startsWith("/_next/") || pathname === "/favicon.ico" || pathname === "/robots.txt") {
      return NextResponse.next();
    }
    // Do not expose private platform API or implementation routes on customer hosts.
    if (pathname.startsWith("/api/") || pathname.startsWith("/site/") || pathname.startsWith("/tenant-site-internal")) {
      return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/site/" + siteSlug + (pathname === "/" ? "" : pathname);
    return NextResponse.rewrite(url);
  }

  if (isPlatformHost(hostname)) return NextResponse.next();

  if (pathname.startsWith("/_next/") || pathname === "/favicon.ico" || pathname === "/robots.txt") {
    return NextResponse.next();
  }

  // Custom customer domains never get access to private API or internal routes.
  if (pathname.startsWith("/api/") || pathname.startsWith("/site/") || pathname.startsWith("/tenant-site-internal")) {
    return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const url = request.nextUrl.clone();
  url.pathname = pathname === "/" ? "/tenant-site-internal" : `/tenant-site-internal${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
