import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

const mocks = vi.hoisted(() => ({
  token: undefined as string | undefined,
  result: [] as Array<{ id: string; displayName: string | null }>,
  getDb: vi.fn(),
  eq: vi.fn((...args: unknown[]) => ({ operator: "eq", args })),
  gt: vi.fn((...args: unknown[]) => ({ operator: "gt", args })),
  and: vi.fn((...args: unknown[]) => ({ operator: "and", args })),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: vi.fn(() => mocks.token ? { value: mocks.token } : undefined) })),
}));
vi.mock("@/lib/db/client", () => ({ getDb: mocks.getDb }));
vi.mock("@/lib/db/schema", () => ({
  appUsers: { id: "app_users.id", displayName: "app_users.display_name", active: "app_users.active" },
  sessions: { userId: "app_sessions.user_id", tokenHash: "app_sessions.token_hash", expiresAt: "app_sessions.expires_at" },
}));
vi.mock("drizzle-orm", () => ({ and: mocks.and, eq: mocks.eq, gt: mocks.gt }));

import { getCurrentUser } from "./session";

beforeEach(() => {
  mocks.token = undefined;
  mocks.result = [];
  mocks.eq.mockClear();
  mocks.gt.mockClear();
  mocks.and.mockClear();
  const query = { from: vi.fn(), innerJoin: vi.fn(), where: vi.fn(), limit: vi.fn() };
  query.from.mockReturnValue(query);
  query.innerJoin.mockReturnValue(query);
  query.where.mockReturnValue(query);
  query.limit.mockImplementation(async () => mocks.result);
  mocks.getDb.mockReturnValue({ select: vi.fn(() => query) });
});
afterEach(() => vi.clearAllMocks());

describe("LUCIA OS product session validation", () => {
  it("does not query storage when the session cookie is absent", async () => {
    await expect(getCurrentUser()).resolves.toBeNull();
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("rejects a malformed short session token before querying storage", async () => {
    mocks.token = "short-token";
    await expect(getCurrentUser()).resolves.toBeNull();
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("hashes the opaque cookie and enforces future expiry plus an active user", async () => {
    mocks.token = "opaque-session-token-that-is-longer-than-forty-characters";
    mocks.result = [{ id: "user-1", displayName: "Test user" }];
    const user = await getCurrentUser();
    const tokenHash = createHash("sha256").update(mocks.token).digest("hex");

    expect(user).toEqual({ id: "user-1", displayName: "Test user" });
    expect(mocks.eq).toHaveBeenCalledWith("app_sessions.token_hash", tokenHash);
    expect(mocks.gt).toHaveBeenCalledWith("app_sessions.expires_at", expect.any(Date));
    expect(mocks.eq).toHaveBeenCalledWith("app_users.active", true);
    expect(mocks.and).toHaveBeenCalledOnce();
    expect(JSON.stringify(mocks.eq.mock.calls)).not.toContain(mocks.token);
  });
});
