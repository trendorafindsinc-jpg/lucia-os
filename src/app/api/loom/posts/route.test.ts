import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  getDb: vi.fn(),
  restriction: vi.fn(),
  rateLimit: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.currentUser }));
vi.mock("@/lib/db/client", () => ({ getDb: mocks.getDb }));
vi.mock("@/lib/loom/staff", () => ({ getLoomRestriction: mocks.restriction }));
vi.mock("@/lib/loom/rate-limit", () => ({ consumeLoomRateLimit: mocks.rateLimit }));

import { POST } from "./route";

function request(body: unknown, origin = "https://loom.example.test") {
  return new Request("https://loom.example.test/api/loom/posts", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  });
}

describe("POST /api/loom/posts authorization boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser.mockResolvedValue({ id: "b8e95a60-fbde-4c37-93e6-a2916c7b13d4", displayName: "Test member" });
    mocks.restriction.mockResolvedValue(null);
    mocks.rateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
    const verificationQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    mocks.getDb.mockReturnValue({
      select: vi.fn(() => verificationQuery),
      insert: vi.fn(),
    });
  });

  it("rejects anonymous publishing before database access", async () => {
    mocks.currentUser.mockResolvedValue(null);
    const response = await POST(request({ body: "A community update" }));
    expect(response.status).toBe(401);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("rejects cross-origin publishing before authentication", async () => {
    const response = await POST(request({ body: "A community update" }, "https://attacker.example"));
    expect(response.status).toBe(403);
    expect(mocks.currentUser).not.toHaveBeenCalled();
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("prevents an unverified member from publishing through the direct API", async () => {
    const response = await POST(request({ body: "A community update" }));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: "BUSINESS_VERIFICATION_REQUIRED" });
    expect(mocks.rateLimit).toHaveBeenCalledOnce();
    expect(mocks.getDb().insert).not.toHaveBeenCalled();
  });

  it("rejects malformed post content before database access", async () => {
    const response = await POST(request({ body: "   " }));
    expect(response.status).toBe(422);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });
});
