import { NextResponse } from "next/server";
import { buildAuthorizationUrl, createOAuthState } from "@/lib/auth/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const state = createOAuthState();
    const response = NextResponse.redirect(buildAuthorizationUrl(state));
    response.cookies.set("lucia_os_oauth_state", state, {
      httpOnly: true,
      secure: new URL(request.url).protocol === "https:",
      sameSite: "lax",
      path: "/api/auth/callback",
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
