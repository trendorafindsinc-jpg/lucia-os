import { generateKeyPairSync, sign } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isAuthorizedCronRequest } from "./authorization";

const pair = generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicJwk = pair.publicKey.export({ format: "jwk" });
const now = Math.floor(Date.now() / 1000);
const expectedClaims = {
  iss: "https://token.actions.githubusercontent.com",
  aud: "lucia-os-phase15-workers",
  sub: "repo:trendorafindsinc-jpg/lucia-os:ref:refs/heads/main",
  repository: "trendorafindsinc-jpg/lucia-os",
  repository_owner: "trendorafindsinc-jpg",
  ref: "refs/heads/main",
  workflow_ref: "trendorafindsinc-jpg/lucia-os/.github/workflows/phase15-scheduled-workers.yml@refs/heads/main",
  event_name: "schedule",
  iat: now - 10,
  nbf: now - 10,
  exp: now + 240,
};

function makeToken(claimOverrides: Record<string, unknown> = {}, privateKey = pair.privateKey) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const head = encode({ alg: "RS256", typ: "JWT", kid: "phase15-test-key" });
  const body = encode({ ...expectedClaims, ...claimOverrides });
  const input = head + "." + body;
  return input + "." + sign("RSA-SHA256", Buffer.from(input), privateKey).toString("base64url");
}

function request(token: string) {
  return new Request("https://os.lucia.name.ng/api/cron/publish-articles", {
    headers: { authorization: "Bearer " + token },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Phase 15 scheduled-worker authorization", () => {
  it("accepts a valid token from the exact main-branch worker workflow", async () => {
    vi.stubEnv("CRON_SECRET", "");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ keys: [publicJwk] }), { status: 200 }),
    ));
    expect(await isAuthorizedCronRequest(request(makeToken()))).toBe(true);
  });

  it.each([
    { repository: "attacker/other-repo" },
    { workflow_ref: "trendorafindsinc-jpg/lucia-os/.github/workflows/other.yml@refs/heads/main" },
    { ref: "refs/heads/feature/untrusted" },
    { event_name: "pull_request" },
    { exp: now - 1 },
  ])("rejects untrusted or expired GitHub claims", async (claims) => {
    vi.stubEnv("CRON_SECRET", "");
    expect(await isAuthorizedCronRequest(request(makeToken(claims)))).toBe(false);
  });

  it("rejects a token whose signature does not match GitHub's published key", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const other = generateKeyPairSync("rsa", { modulusLength: 2048 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ keys: [publicJwk] }), { status: 200 }),
    ));
    expect(await isAuthorizedCronRequest(request(makeToken({}, other.privateKey))).then(Boolean)).toBe(false);
  });

  it("retains constant-time CRON_SECRET compatibility for existing deployments", async () => {
    vi.stubEnv("CRON_SECRET", "test-cron-secret-value");
    expect(await isAuthorizedCronRequest(request("test-cron-secret-value"))).toBe(true);
    expect(await isAuthorizedCronRequest(request("wrong-secret"))).toBe(false);
  });
});
