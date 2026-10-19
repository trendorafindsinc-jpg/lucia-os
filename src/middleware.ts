import { NextRequest, NextResponse } from "next/server";
import { resolveLuciaSubdomain } from "@/lib/publishing/host";

const RESERVED_PATHS = ["/api/", "/_next/", "/site/"];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (RESERVED_PATHS.some((prefix) => pathname.startsWith(prefix))) return NextResponse.next();

  const domain = process.env.LUCIA_SITE_DOMAIN || "lucia.name.ng";
  const slug = resolveLuciaSubdomain(request.headers.get("host"), domain);
  if (!slug) return NextResponse.next();

  const destination = request.nextUrl.clone();
  destination.pathname = "/site/" + slug + (pathname === "/" ? "" : pathname);
  return NextResponse.rewrite(destination);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
