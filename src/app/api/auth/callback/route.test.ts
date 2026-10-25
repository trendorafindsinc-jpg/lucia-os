import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/client", () => ({ getDb: vi.fn() }));
vi.mock("@/lib/auth/oauth", () => ({
  getCoreIssuer: vi.fn(),
  matchesOAuthState: vi.fn(() => false),
}));

import { GET } from "./route";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("LUCIA ID callback failure handling", () => {
  it("clears OAuth state and return-to cookies on rejected state and disables caching", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const request = new Request(
      "https://os.example/api/auth/callback?code=one-time-code&state=bad-state",
      {
        headers: {
          cookie: "lucia_os_oauth_state=expected-state; lucia_os_return_to=%2Fworkspace",
        },
      },
    );

    const response = await GET(request);
    const cookies = response.headers.get("set-cookie") ?? "";

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("reason=state_validation");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(cookies).toContain("lucia_os_oauth_state=");
    expect(cookies).toContain("lucia_os_return_to=");
    expect(cookies).toContain("Max-Age=0");
    expect(cookies).toContain("HttpOnly");
    expect(cookies).toContain("Secure");
  });

  it("uses Secure cookies for HTTPS requests even outside production mode", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const response = await GET(new Request(
      "https://os.example/api/auth/callback?code=code&state=state",
    ));
    const cookies = response.headers.get("set-cookie") ?? "";

    expect(cookies).toContain("lucia_os_oauth_state=");
    expect(cookies).toContain("Secure");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
