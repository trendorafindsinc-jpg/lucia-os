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

import { GET, POST } from "./route";

const memberId = "b8e95a60-fbde-4c37-93e6-a2916c7b13d4";

function postRequest(body: unknown, origin = "https://loom.example.test") {
  return new Request("https://loom.example.test/api/loom/messages", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  });
}

describe("Loom private-message authorization boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser.mockResolvedValue({ id: memberId, displayName: "Test member" });
    mocks.restriction.mockResolvedValue(null);
    mocks.rateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
  });

  it("rejects anonymous message reads before database access", async () => {
    mocks.currentUser.mockResolvedValue(null);
    const response = await GET(new Request("https://loom.example.test/api/loom/messages?with=" + memberId));
    expect(response.status).toBe(401);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("rejects anonymous message sends before database access", async () => {
    mocks.currentUser.mockResolvedValue(null);
    const response = await POST(postRequest({ recipientUserId: memberId, body: "Hello" }));
    expect(response.status).toBe(401);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("rejects cross-origin message sends before authentication or database access", async () => {
    const response = await POST(postRequest({ recipientUserId: "9f01ed80-9900-4ed7-bf38-7df0b531eaf4", body: "Hello" }, "https://attacker.example"));
    expect(response.status).toBe(403);
    expect(mocks.currentUser).not.toHaveBeenCalled();
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("rejects sending a private message to oneself", async () => {
    const response = await POST(postRequest({ recipientUserId: memberId, body: "Hello myself" }));
    expect(response.status).toBe(422);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("rejects invalid conversation IDs without querying message history", async () => {
    const response = await GET(new Request("https://loom.example.test/api/loom/messages?with=not-a-uuid"));
    expect(response.status).toBe(400);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("denies message history to verified members without an accepted connection", async () => {
    const peerId = "9f01ed80-9900-4ed7-bf38-7df0b531eaf4";
    const limit = vi.fn()
      .mockResolvedValueOnce({ status: "verified" })
      .mockResolvedValueOnce({ status: "verified" })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);
    const chain = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      limit,
    };
    const db = {
      select: vi.fn(() => chain),
      update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) })),
    };
    mocks.getDb.mockReturnValue(db);
    const response = await GET(new Request("https://loom.example.test/api/loom/messages?with=" + peerId));
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: "An accepted connection is required before messaging." });
    expect(db.select).toHaveBeenCalledTimes(4);
    expect(db.update).not.toHaveBeenCalled();
  });
});
