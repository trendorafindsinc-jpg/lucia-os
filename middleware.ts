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
      // Invalid deployment configuration must not disable exact-host checks.
    }
  }
  return false;
}

function normalizeDomain(configuredDomain: string): string {
  return configuredDomain.trim().toLowerCase().replace(/^\*\./, "").replace(/^\./, "").replace(/\.$/, "");
}

function isUnderSiteDomain(hostname: string, configuredDomain: string): boolean {
  const domain = normalizeDomain(configuredDomain);
  return Boolean(domain) && hostname.endsWith("." + domain);
}

function notFound() {
  return new NextResponse("Not found", {
    status: 404,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

function isPrivatePath(pathname: string): boolean {
  return pathname.startsWith("/api/") ||
    pathname.startsWith("/site/") ||
    pathname === "/tenant-site-internal" ||
    pathname.startsWith("/tenant-site-internal/");
}

export function middleware(request: NextRequest) {
  const hostname = request.nextUrl.hostname.toLowerCase();
  if (isPlatformHost(hostname)) return NextResponse.next();

  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/_next/") || pathname === "/favicon.ico" || pathname === "/robots.txt") {
    return NextResponse.next();
  }

  const configuredSiteDomain = process.env.LUCIA_SITE_DOMAIN || "lucia.name.ng";
  if (isUnderSiteDomain(hostname, configuredSiteDomain)) {
    const slug = resolveLuciaSubdomain(hostname, configuredSiteDomain);
    // Reserved or malformed LUCIA subdomains must not fall through and be
    // interpreted as customer-owned custom domains (for example staff.*).
    if (!slug || isPrivatePath(pathname)) return notFound();

    // Keep the customer's public URL while routing to its server-side site page.
    const destination = request.nextUrl.clone();
    destination.pathname = `/site/${slug}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(destination);
  }

  // Customer custom domains never get access to the product's private API or
  // implementation routes. These paths are not forwarded into tenant sites.
  if (isPrivatePath(pathname)) return notFound();

  // Internal rewrite stays server-side; the browser retains its public URL.
  const url = request.nextUrl.clone();
  url.pathname = pathname === "/" ? "/tenant-site-internal" : `/tenant-site-internal${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
