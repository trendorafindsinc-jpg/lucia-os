import { NextResponse } from "next/server";
import { buildAuthorizationUrl, createOAuthState } from "@/lib/auth/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const state = createOAuthState();
    const requestedReturnTo = new URL(request.url).searchParams.get("returnTo");
    const returnTo = requestedReturnTo && requestedReturnTo.startsWith("/") && !requestedReturnTo.startsWith("//") && !requestedReturnTo.includes("\\") && !requestedReturnTo.startsWith("/api/auth")
      ? requestedReturnTo
      : "/workspace";
    const secureCookies = process.env.NODE_ENV === "production" || new URL(request.url).protocol === "https:";
    const response = NextResponse.redirect(buildAuthorizationUrl(state));
    response.cookies.set("lucia_os_return_to", returnTo, {
      httpOnly: true,
      secure: secureCookies,
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 300,
    });
    response.cookies.set("lucia_os_oauth_state", state, {
      httpOnly: true,
      secure: secureCookies,
      sameSite: "lax",
      // The registered production callback is nested under /api/auth/lucia/callback.
      // Scope to /api/auth so the state cookie reaches both canonical and legacy handlers.
      path: "/api/auth",
      maxAge: 300,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return NextResponse.json(
      { error: "AUTH_NOT_CONFIGURED", message: "LUCIA ID sign-in is not configured yet." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
