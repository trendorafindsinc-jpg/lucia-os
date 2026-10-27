import { NextResponse } from "next/server";
import { buildAuthorizationUrl, createOAuthState } from "@/lib/auth/oauth";
import { resolveSafeReturnTo } from "@/lib/auth/return-to";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const state = createOAuthState();
    const requestedReturnTo = new URL(request.url).searchParams.get("returnTo");
    const returnTo = resolveSafeReturnTo(requestedReturnTo);
    const response = NextResponse.redirect(buildAuthorizationUrl(state));
    response.cookies.set("lucia_os_return_to", returnTo, {
      httpOnly: true,
      secure: new URL(request.url).protocol === "https:",
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 300,
    });
    response.cookies.set("lucia_os_oauth_state", state, {
      httpOnly: true,
      secure: new URL(request.url).protocol === "https:",
      sameSite: "lax",
      // The registered production callback is nested under /api/auth/lucia/callback.
      // Scope to /api/auth so the state cookie reaches both canonical and legacy handlers.
      path: "/api/auth",
      maxAge: 300,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    console.error("[LUCIA_OS_OAUTH] login could not be initialized");
    return NextResponse.json(
      { error: "SIGN_IN_UNAVAILABLE", message: "Sign-in is temporarily unavailable. Please try again shortly." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
