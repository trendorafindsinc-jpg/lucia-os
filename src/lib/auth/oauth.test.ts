import { afterEach, describe, expect, it, vi } from "vitest";
import { buildAuthorizationUrl, createOAuthState, getSafeReturnTo, matchesOAuthState } from "@/lib/auth/oauth";

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

  it("restores a percent-encoded internal return destination", () => {
    expect(getSafeReturnTo("lucia_os_return_to=%2Feditor%3FwebsiteId%3Dabc")).toBe("/editor?websiteId=abc");
  });

  it.each([
    "lucia_os_return_to=%2F%2Fevil.example",
    "lucia_os_return_to=%2Fapi%2Fauth%2Flogout",
    "lucia_os_return_to=%2F%5C%5Cevil.example",
    "lucia_os_return_to=%2F%5Cevil.example",
    "lucia_os_return_to=%E0%A4%A",
    "other=value",
  ])("falls back safely for invalid callback destination cookie (%s)", (cookie) => {
    expect(getSafeReturnTo(cookie)).toBe("/workspace");
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
