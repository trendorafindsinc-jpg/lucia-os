import { NextRequest, NextResponse } from "next/server";
import { resolveLuciaSubdomain } from "@/lib/publishing/host";

const PLATFORM_HOSTS = new Set([
  "lucia.name.ng",
  "www.lucia.name.ng",
  "os.lucia.name.ng",
  "lucia-os.vercel.app",
]);

function isPlatformHost(hostname: string): boolean {
  if (PLATFORM_HOSTS.has(hostname)) return true;
  const configured = process.env.APP_BASE_URL;
  if (configured) {
    try {
      if (new URL(configured).hostname.toLowerCase() === hostname) return true;
    } catch {
      // Invalid configuration must not disable normal host checks.
    }
  }
  const vercelUrl = process.env.VERCEL_URL?.toLowerCase().replace(/:\d+$/, "");
  return Boolean(vercelUrl && hostname === vercelUrl);
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
    // Reserved or malformed LUCIA subdomains must not fall through as custom domains.
    if (!slug || isPrivatePath(pathname)) return notFound();

    const destination = request.nextUrl.clone();
    destination.pathname = `/site/${slug}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(destination);
  }

  // Customer custom domains cannot reach product APIs or internal rewrite routes.
  if (isPrivatePath(pathname)) return notFound();

  const destination = request.nextUrl.clone();
  destination.pathname = pathname === "/" ? "/tenant-site-internal" : `/tenant-site-internal${pathname}`;
  return NextResponse.rewrite(destination);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
