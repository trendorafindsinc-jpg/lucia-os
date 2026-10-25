import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: vi.fn(() => undefined) })),
}));
vi.mock("@/lib/db/client", () => ({ getDb: vi.fn() }));

import { POST } from "./route";

afterEach(() => vi.unstubAllEnvs());

describe("LUCIA OS logout", () => {
  it("expires the session cookie with Secure on HTTPS and disables caching", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const response = await POST(new Request("https://os.example/api/auth/logout", {
      method: "POST",
    }));
    const cookie = response.headers.get("set-cookie") ?? "";

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://os.example/");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(cookie).toContain("lucia_os_session=");
    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
  });

  it("does not mark cookies Secure for plain HTTP outside production", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const response = await POST(new Request("http://localhost:3000/api/auth/logout", {
      method: "POST",
    }));
    const cookie = response.headers.get("set-cookie") ?? "";

    expect(cookie).toContain("lucia_os_session=");
    expect(cookie).not.toContain("Secure");
  });
});
