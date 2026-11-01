import { NextRequest, NextResponse } from "next/server";
import { resolveLuciaSubdomain } from "@/lib/publishing/host";

import {isPlatformHostname as isPlatformHost} from "@/lib/publishing/platform-hosts";

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
  // Next.js may construct nextUrl from its internal server origin. The original
  // HTTP Host selects the public site; client-supplied forwarded headers do not.
  const hostname = (request.headers.get("host") || request.nextUrl.host)
    .trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
  const media = /^\/_media\/([0-9a-f-]{36})$/.exec(request.nextUrl.pathname);
  if (media && request.method === "GET") {
    const destination = request.nextUrl.clone();
    destination.pathname = "/api/media/" + media[1];
    return NextResponse.rewrite(destination);
  }
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
