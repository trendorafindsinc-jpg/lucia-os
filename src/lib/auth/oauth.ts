import { randomBytes, timingSafeEqual } from "node:crypto";

const CORE_AUTHORIZE_PATH = "/api/v1/consumer/oauth/authorize";

export function createOAuthState(): string {
  return randomBytes(32).toString("base64url");
}

export function matchesOAuthState(expected: string | undefined, received: string | undefined): boolean {
  if (!expected || !received) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(received);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function getCoreIssuer(): URL {
  const raw = process.env.LUCIA_CORE_ISSUER;
  if (!raw) throw new Error("LUCIA_CORE_ISSUER is not configured.");

  const issuer = new URL(raw);
  const localDevelopment = process.env.NODE_ENV !== "production" &&
    (issuer.hostname === "localhost" || issuer.hostname === "127.0.0.1");
  if (issuer.protocol !== "https:" && !localDevelopment) {
    throw new Error("LUCIA_CORE_ISSUER must use HTTPS.");
  }
  if (issuer.username || issuer.password || issuer.search || issuer.hash || issuer.pathname !== "/") {
    throw new Error("LUCIA_CORE_ISSUER must be an origin without credentials, path, query, or fragment.");
  }
  return issuer;
}

export function buildAuthorizationUrl(state: string): URL {
  const clientId = process.env.LUCIA_CORE_CLIENT_ID;
  const audience = process.env.LUCIA_CORE_AUDIENCE;
  const redirectUri = process.env.LUCIA_CORE_REDIRECT_URI;
  if (!clientId || !audience || !redirectUri) {
    throw new Error("LUCIA Core consumer settings are incomplete.");
  }

  const callback = new URL(redirectUri);
  if (callback.protocol !== "https:" && process.env.NODE_ENV === "production") {
    throw new Error("LUCIA_CORE_REDIRECT_URI must use HTTPS in production.");
  }
  const url = new URL(CORE_AUTHORIZE_PATH, getCoreIssuer());
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", callback.toString());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("audience", audience);
  url.searchParams.set("state", state);
  return url;
}
