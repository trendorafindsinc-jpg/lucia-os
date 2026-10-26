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

import { PATCH, POST } from "./route";

const memberId = "b8e95a60-fbde-4c37-93e6-a2916c7b13d4";
const peerId = "9f01ed80-9900-4ed7-bf38-7df0b531eaf4";
const connectionId = "8d4c4a45-f8f1-41c1-90b4-9a4f6a77a9d1";

function request(method: "POST" | "PATCH", body: unknown, origin = "https://loom.example.test") {
  return new Request("https://loom.example.test/api/loom/connections", {
    method,
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  });
}

describe("Loom connection request safety boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser.mockResolvedValue({ id: memberId, displayName: "Member" });
    mocks.restriction.mockResolvedValue(null);
    mocks.rateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
  });

  it("rejects anonymous connection requests before database access", async () => {
    mocks.currentUser.mockResolvedValue(null);
    const response = await POST(request("POST", { recipientUserId: peerId }));
    expect(response.status).toBe(401);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("rejects cross-origin request and decision actions before authentication", async () => {
    const create = await POST(request("POST", { recipientUserId: peerId }, "https://attacker.example"));
    const update = await PATCH(request("PATCH", { connectionId, action: "accept" }, "https://attacker.example"));
    expect(create.status).toBe(403);
    expect(update.status).toBe(403);
    expect(mocks.currentUser).not.toHaveBeenCalled();
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("rejects self-connection requests before database access", async () => {
    const response = await POST(request("POST", { recipientUserId: memberId }));
    expect(response.status).toBe(422);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("rejects malformed connection decisions before database access", async () => {
    const response = await PATCH(request("PATCH", { connectionId: "not-a-uuid", action: "accept" }));
    expect(response.status).toBe(422);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });
});
