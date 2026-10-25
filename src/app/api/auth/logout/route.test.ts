import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

const mocks = vi.hoisted(() => ({
  token: undefined as string | undefined,
  deleteWhere: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn((column: unknown, value: unknown) => ({ column, value })),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: vi.fn(() => mocks.token ? { value: mocks.token } : undefined) })),
}));
vi.mock("@/lib/db/client", () => ({
  getDb: vi.fn(() => ({ delete: mocks.delete })),
}));
vi.mock("@/lib/db/schema", () => ({ sessions: { tokenHash: "token_hash" } }));
vi.mock("drizzle-orm", () => ({ eq: mocks.eq }));

import { POST } from "./route";

beforeEach(() => {
  mocks.token = undefined;
  mocks.deleteWhere.mockReset();
  mocks.delete.mockReset().mockReturnValue({ where: mocks.deleteWhere });
  mocks.eq.mockClear();
});
afterEach(() => vi.unstubAllEnvs());

describe("LUCIA OS logout", () => {
  it("revokes the server-side session and expires its Secure cookie on HTTPS", async () => {
    vi.stubEnv("NODE_ENV", "test");
    mocks.token = "session-token-that-is-long-enough-to-be-opaque";
    const response = await POST(new Request("https://os.example/api/auth/logout", {
      method: "POST",
    }));
    const cookie = response.headers.get("set-cookie") ?? "";
    const tokenHash = createHash("sha256").update(mocks.token).digest("hex");

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://os.example/");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.delete).toHaveBeenCalledOnce();
    expect(mocks.eq).toHaveBeenCalledWith("token_hash", tokenHash);
    expect(mocks.deleteWhere).toHaveBeenCalledOnce();
    expect(cookie).toContain("lucia_os_session=");
    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
  });

  it("does not query the session table when no session cookie exists", async () => {
    const response = await POST(new Request("https://os.example/api/auth/logout", {
      method: "POST",
    }));

    expect(response.status).toBe(303);
    expect(mocks.delete).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toBe("no-store");
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
