import { afterEach, describe, expect, it, vi } from "vitest";
import { buildAuthorizationUrl, createOAuthState, matchesOAuthState } from "@/lib/auth/oauth";

describe("LUCIA Core OAuth helpers", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("creates high-entropy URL-safe state", () => {
    const state = createOAuthState();
    expect(state).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(createOAuthState()).not.toBe(state);
  });

  it("requires an exact state match", () => {
    expect(matchesOAuthState("abc", "abc")).toBe(true);
    expect(matchesOAuthState("abc", "abd")).toBe(false);
    expect(matchesOAuthState(undefined, "abc")).toBe(false);
    expect(matchesOAuthState("abc", undefined)).toBe(false);
  });

  it("builds the documented Core authorize URL with all required bindings", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("LUCIA_CORE_ISSUER", "https://lucia-secure.vercel.app");
    vi.stubEnv("LUCIA_CORE_CLIENT_ID", "test-client");
    vi.stubEnv("LUCIA_CORE_AUDIENCE", "lucia_website");
    vi.stubEnv("LUCIA_CORE_REDIRECT_URI", "https://lucia.example/api/auth/callback");

    const url = buildAuthorizationUrl("state-value");
    expect(url.origin).toBe("https://lucia-secure.vercel.app");
    expect(url.pathname).toBe("/api/v1/consumer/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("test-client");
    expect(url.searchParams.get("redirect_uri")).toBe("https://lucia.example/api/auth/callback");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("audience")).toBe("lucia_website");
    expect(url.searchParams.get("state")).toBe("state-value");
  });

  it("rejects an issuer with a path", () => {
    vi.stubEnv("LUCIA_CORE_ISSUER", "https://example.com/untrusted");
    vi.stubEnv("LUCIA_CORE_CLIENT_ID", "test-client");
    vi.stubEnv("LUCIA_CORE_AUDIENCE", "lucia_website");
    vi.stubEnv("LUCIA_CORE_REDIRECT_URI", "https://lucia.example/api/auth/callback");
    expect(() => buildAuthorizationUrl("state-value")).toThrow();
  });
});
