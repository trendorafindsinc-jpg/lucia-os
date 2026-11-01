import { createPublicKey, timingSafeEqual, verify } from "node:crypto";

const ISSUER = "https://token.actions.githubusercontent.com";
const AUDIENCE = "lucia-os-phase15-workers";
const REPOSITORY = "trendorafindsinc-jpg/lucia-os";
const WORKFLOW_REF = REPOSITORY + "/.github/workflows/phase15-scheduled-workers.yml@refs/heads/main";
const SUBJECT = "repo:" + REPOSITORY + ":ref:refs/heads/main";
const JWKS_URL = ISSUER + "/.well-known/jwks";

type TokenHeader = { alg?: unknown; kid?: unknown; typ?: unknown };
type TokenClaims = {
  iss?: unknown; aud?: unknown; sub?: unknown; repository?: unknown;
  repository_owner?: unknown; ref?: unknown; workflow_ref?: unknown;
  event_name?: unknown; iat?: unknown; nbf?: unknown; exp?: unknown;
};
type GitHubJwk = JsonWebKey & { kid?: string; kty?: string };
let cachedKeys: GitHubJwk[] = [];
let keysExpireAt = 0;

function decodeJson<T>(value: string): T {
  const parsed: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid token JSON.");
  return parsed as T;
}

async function getGitHubKeys(): Promise<GitHubJwk[]> {
  if (cachedKeys.length && keysExpireAt > Date.now()) return cachedKeys;
  const response = await fetch(JWKS_URL, { cache: "no-store", signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error("GitHub signing keys are unavailable.");
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || !Array.isArray((body as { keys?: unknown }).keys)) {
    throw new Error("GitHub signing-key response is invalid.");
  }
  const keys = (body as { keys: GitHubJwk[] }).keys;
  cachedKeys = keys.filter((key) => key.kty === "RSA" && typeof key.kid === "string" &&
    typeof key.n === "string" && typeof key.e === "string");
  keysExpireAt = Date.now() + 5 * 60 * 1000;
  return cachedKeys;
}

async function verifyGitHubActionsToken(token: string): Promise<boolean> {
  if (token.length > 8192) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((part) => !part)) return false;
  try {
    const header = decodeJson<TokenHeader>(parts[0]);
    const claims = decodeJson<TokenClaims>(parts[1]);
    if (header.alg !== "RS256" || typeof header.kid !== "string" ||
        (header.typ !== undefined && header.typ !== "JWT")) return false;
    const now = Math.floor(Date.now() / 1000);
    const audienceMatches = claims.aud === AUDIENCE ||
      (Array.isArray(claims.aud) && claims.aud.includes(AUDIENCE));
    if (claims.iss !== ISSUER || !audienceMatches || claims.sub !== SUBJECT ||
        claims.repository !== REPOSITORY || claims.repository_owner !== "trendorafindsinc-jpg" ||
        claims.ref !== "refs/heads/main" || claims.workflow_ref !== WORKFLOW_REF ||
        (claims.event_name !== "schedule" && claims.event_name !== "workflow_dispatch") ||
        typeof claims.iat !== "number" || typeof claims.nbf !== "number" ||
        typeof claims.exp !== "number" || claims.iat > now + 60 ||
        claims.iat < now - 600 || claims.nbf > now + 60 || claims.exp <= now ||
        claims.exp - claims.iat > 600) return false;

    const jwk = (await getGitHubKeys()).find((key) => key.kid === header.kid);
    if (!jwk) return false;
    const publicKey = createPublicKey({ key: jwk, format: "jwk" });
    return verify("RSA-SHA256", Buffer.from(parts[0] + "." + parts[1]),
      publicKey, Buffer.from(parts[2], "base64url"));
  } catch {
    return false;
  }
}

/** Accept Vercel's configured secret or a short-lived OIDC token from the one trusted GitHub worker. */
export async function isAuthorizedCronRequest(request: Request): Promise<boolean> {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\\s+/i, "") ?? "";
  if (!supplied) return false;
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const a = Buffer.from(expected);
    const b = Buffer.from(supplied);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return verifyGitHubActionsToken(supplied);
}
