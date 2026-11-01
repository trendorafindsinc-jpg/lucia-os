import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  membershipsForUser: vi.fn(),
  hasPermission: vi.fn(),
  getDb: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.currentUser }));
vi.mock("@/lib/access/guards", () => ({ getOrganizationMembershipsForUser: mocks.membershipsForUser }));
vi.mock("@/lib/access/policy", () => ({ hasOrganizationPermission: mocks.hasPermission }));
vi.mock("@/lib/db/client", () => ({ getDb: mocks.getDb }));
vi.mock("drizzle-orm", () => ({
  and: (...values: unknown[]) => values,
  eq: (...values: unknown[]) => values,
  ne: (...values: unknown[]) => values,
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings: [...strings], values }),
}));

import { POST } from "./route";

const userId = "b8e95a60-fbde-4c37-93e6-a2916c7b13d4";
const organizationId = "f1e4dbf7-12b6-4285-8c4c-42cdb0b4e1fa";
const websiteId = "a660ce01-079a-4409-a9e0-c5eb30c699b9";
const body = { websiteId, hostname: "custom-example.org" };

function request(payload: unknown = body, origin = "https://os.lucia.name.ng") {
  return new Request("https://os.lucia.name.ng/api/domains", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(payload),
  });
}

describe("POST /api/domains authorization and failure boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser.mockResolvedValue({ id: userId, displayName: "Test owner" });
    mocks.membershipsForUser.mockResolvedValue([{
      id: organizationId,
      name: "Test organization",
      role: "owner",
      membershipStatus: "active",
    }]);
    mocks.hasPermission.mockReturnValue(true);
    const query = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    const tx = { execute: vi.fn().mockResolvedValue([]), select: vi.fn(() => query), insert: vi.fn() };
    mocks.getDb.mockReturnValue({
      transaction: vi.fn(async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx)),
    });
  });

  it("rejects cross-origin writes before reading identity or storage", async () => {
    const response = await POST(request(body, "https://attacker.example"));
    expect(response.status).toBe(403);
    expect(mocks.currentUser).not.toHaveBeenCalled();
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated requests before storage access", async () => {
    mocks.currentUser.mockResolvedValue(null);
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON without opening a database transaction", async () => {
    const malformed = new Request("https://os.lucia.name.ng/api/domains", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://os.lucia.name.ng" },
      body: "{",
    });
    const response = await POST(malformed);
    expect(response.status).toBe(400);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("denies an organization without website-publish permission", async () => {
    mocks.hasPermission.mockReturnValue(false);
    const response = await POST(request());
    expect(response.status).toBe(403);
    expect(mocks.getDb).toHaveBeenCalledOnce();
  });

  it("does not register a domain when the website is not in any authorized organization", async () => {
    const response = await POST(request());
    expect(response.status).toBe(403);
    expect(mocks.getDb).toHaveBeenCalledOnce();
    expect(mocks.membershipsForUser).toHaveBeenCalledWith(userId);
  });
});
