import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireLoomStaff: vi.fn(),
  getDb: vi.fn(),
}));

vi.mock("@/lib/loom/staff", () => ({ requireLoomStaff: mocks.requireLoomStaff }));
vi.mock("@/lib/db/client", () => ({ getDb: mocks.getDb }));

import { GET, PATCH } from "./route";

function patchRequest(origin = "https://loom.example.test") {
  return new Request("https://loom.example.test/api/loom/staff/reports", {
    method: "PATCH",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ reportId: "b8e95a60-fbde-4c37-93e6-a2916c7b13d4", decision: "resolved" }),
  });
}

describe("Loom staff moderation authorization boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireLoomStaff.mockResolvedValue({ user: { id: "b8e95a60-fbde-4c37-93e6-a2916c7b13d4" }, denied: "forbidden" });
  });

  it("denies report queue access to non-staff users", async () => {
    const response = await GET();
    expect(response.status).toBe(403);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("denies moderation actions to non-staff users", async () => {
    const response = await PATCH(patchRequest());
    expect(response.status).toBe(403);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("rejects cross-origin moderation requests before staff authorization", async () => {
    const response = await PATCH(patchRequest("https://attacker.example"));
    expect(response.status).toBe(403);
    expect(mocks.requireLoomStaff).not.toHaveBeenCalled();
    expect(mocks.getDb).not.toHaveBeenCalled();
  });
});
