import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { appUsers, sessions } from "@/lib/db/schema";
import { getCoreIssuer, matchesOAuthState } from "@/lib/auth/oauth";
import { resolveSafeReturnTo } from "@/lib/auth/return-to";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_COOKIE = "lucia_os_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function safeFailure(request: Request) {
  // Keep implementation stage names in server logs only, never in browser URLs.
  const response = NextResponse.redirect(new URL("/?auth=failed", request.url));
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code") ?? undefined;
  const state = requestUrl.searchParams.get("state") ?? undefined;
  const expectedState = request.headers.get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("lucia_os_oauth_state="))
    ?.slice("lucia_os_oauth_state=".length);

  const returnTo = request.headers.get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("lucia_os_return_to="))
    ?.slice("lucia_os_return_to=".length);
  const safeReturnTo = resolveSafeReturnTo(returnTo);

  let failureStage = "state_validation";
  const response = safeFailure(request);
  response.cookies.set("lucia_os_return_to", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || requestUrl.protocol === "https:",
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 0,
  });
  response.cookies.set("lucia_os_oauth_state", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || requestUrl.protocol === "https:",
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "no-store");

  if (!matchesOAuthState(expectedState, state) || !code) {
    console.error("[LUCIA_OS_OAUTH] callback rejected", {
      stage: failureStage,
      hasCode: Boolean(code),
      hasStateCookie: Boolean(expectedState),
      hasStateQuery: Boolean(state),
      stateMatches: matchesOAuthState(expectedState, state),
    });
    return safeFailure(request);
  }

  try {
    failureStage = "configuration";
    const issuer = getCoreIssuer();
    const clientId = process.env.LUCIA_CORE_CLIENT_ID;
    const clientSecret = process.env.LUCIA_CORE_CLIENT_SECRET;
    const audience = process.env.LUCIA_CORE_AUDIENCE;
    const redirectUri = process.env.LUCIA_CORE_REDIRECT_URI;
    if (!clientId || !clientSecret || !audience || !redirectUri) { console.error("[LUCIA_OS_OAUTH] callback configuration incomplete", { hasClientId: Boolean(clientId), hasClientSecret: Boolean(clientSecret), hasAudience: Boolean(audience), hasRedirectUri: Boolean(redirectUri) }); return safeFailure(request); }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    failureStage = "token_exchange";
    const tokenResponse = await fetch(new URL("/api/v1/consumer/oauth/token", issuer), {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        audience,
      }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    if (!tokenResponse.ok) {
      let coreError = "unreadable_error";
      try {
        const errorPayload: unknown = await tokenResponse.json();
        if (errorPayload && typeof errorPayload === "object") {
          const payload = errorPayload as Record<string, unknown>;
          if (typeof payload.error === "string") coreError = payload.error.slice(0, 80);
          else if (typeof payload.code === "string") coreError = payload.code.slice(0, 80);
        }
      } catch { /* Keep only the safe fallback; never log response bodies. */ }
      console.error("[LUCIA_OS_OAUTH] token exchange rejected", { status: tokenResponse.status, coreError });
      return safeFailure(request);
    }

    failureStage = "token_payload";
    const tokenPayload: unknown = await tokenResponse.json();
    if (!tokenPayload || typeof tokenPayload !== "object") { console.error("[LUCIA_OS_OAUTH] invalid token payload", { kind: typeof tokenPayload }); return safeFailure(request); }
    const tokenData = tokenPayload as Record<string, unknown>;
    if (
      typeof tokenData.token !== "string" ||
      tokenData.tokenType !== "Bearer" ||
      typeof tokenData.expiresIn !== "number" ||
      !tokenData.user || typeof tokenData.user !== "object"
    ) { console.error("[LUCIA_OS_OAUTH] unexpected token response shape", { hasToken: typeof tokenData.token === "string", tokenType: tokenData.tokenType, hasExpiresIn: typeof tokenData.expiresIn === "number", hasUser: Boolean(tokenData.user && typeof tokenData.user === "object") }); return safeFailure(request); }
    const coreUser = tokenData.user as Record<string, unknown>;
    if (typeof coreUser.id !== "string" || typeof coreUser.displayName !== "string") { console.error("[LUCIA_OS_OAUTH] token user shape invalid", { hasId: typeof coreUser.id === "string", hasDisplayName: typeof coreUser.displayName === "string" }); return safeFailure(request); }

    failureStage = "identity_lookup";
    const identityResponse = await fetch(new URL("/api/v1/consumer/identity", issuer), {
      headers: { Authorization: `Bearer ${tokenData.token}`, Accept: "application/json" },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    if (!identityResponse.ok) { console.error("[LUCIA_OS_OAUTH] identity lookup rejected", { status: identityResponse.status }); return safeFailure(request); }
    failureStage = "identity_payload";
    const identityPayload: unknown = await identityResponse.json();
    if (!identityPayload || typeof identityPayload !== "object") { console.error("[LUCIA_OS_OAUTH] invalid identity payload", { kind: typeof identityPayload }); return safeFailure(request); }
    const identityRoot = identityPayload as Record<string, unknown>;
    const identityUser = identityRoot.user && typeof identityRoot.user === "object"
      ? identityRoot.user as Record<string, unknown>
      : identityRoot;
    if (identityUser.id !== coreUser.id) { console.error("[LUCIA_OS_OAUTH] identity subject mismatch"); return safeFailure(request); }

    failureStage = "session_persistence";
    const db = getDb();
    const [user] = await db
      .insert(appUsers)
      .values({
        coreSubjectId: coreUser.id,
        displayName: coreUser.displayName,
        active: true,
      })
      .onConflictDoUpdate({
        target: appUsers.coreSubjectId,
        set: { displayName: coreUser.displayName, active: true, updatedAt: new Date() },
      })
      .returning({ id: appUsers.id });

    const rawSessionToken = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(rawSessionToken).digest("hex");
    const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
    await db.insert(sessions).values({ userId: user.id, tokenHash, expiresAt });

    const success = NextResponse.redirect(new URL(safeReturnTo, request.url));
    success.cookies.set(SESSION_COOKIE, rawSessionToken, {
      httpOnly: true,
      secure: requestUrl.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });
    success.cookies.set("lucia_os_return_to", "", {
      httpOnly: true,
      secure: requestUrl.protocol === "https:",
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 0,
    });
    success.cookies.set("lucia_os_oauth_state", "", {
      httpOnly: true,
      secure: requestUrl.protocol === "https:",
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 0,
    });
    success.headers.set("Cache-Control", "no-store");
    return success;
  } catch (error) {
    console.error("[LUCIA_OS_OAUTH] callback exception", { stage: failureStage, errorName: error instanceof Error ? error.name : "UnknownError" });
    return safeFailure(request, failureStage === "session_persistence" ? "session_persistence" : failureStage);
  }
}
