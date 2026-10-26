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

import { DELETE, POST } from "./route";

const memberId = "b8e95a60-fbde-4c37-93e6-a2916c7b13d4";
const peerId = "9f01ed80-9900-4ed7-bf38-7df0b531eaf4";

function request(method: "POST" | "DELETE", body: unknown, origin = "https://loom.example.test") {
  return new Request("https://loom.example.test/api/loom/blocks", {
    method,
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  });
}

describe("Loom block safety boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser.mockResolvedValue({ id: memberId });
    mocks.restriction.mockResolvedValue(null);
    mocks.rateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
  });

  it("rejects anonymous block requests before database access", async () => {
    mocks.currentUser.mockResolvedValue(null);
    const response = await POST(request("POST", { userId: peerId }));
    expect(response.status).toBe(401);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("rejects cross-origin block and unblock requests before authentication", async () => {
    const blockResponse = await POST(request("POST", { userId: peerId }, "https://attacker.example"));
    const unblockResponse = await DELETE(request("DELETE", { userId: peerId }, "https://attacker.example"));
    expect(blockResponse.status).toBe(403);
    expect(unblockResponse.status).toBe(403);
    expect(mocks.currentUser).not.toHaveBeenCalled();
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("rejects attempts to block oneself before database access", async () => {
    const response = await POST(request("POST", { userId: memberId }));
    expect(response.status).toBe(422);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("rejects malformed unblock targets before database access", async () => {
    const response = await DELETE(request("DELETE", { userId: "not-a-uuid" }));
    expect(response.status).toBe(422);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });
});
