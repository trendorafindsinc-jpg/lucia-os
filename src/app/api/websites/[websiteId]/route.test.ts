import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  user: vi.fn(), members: vi.fn(), db: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/access/guards", () => ({ getOrganizationMembershipsForUser: mocks.members }));
vi.mock("@/lib/db/client", () => ({ getDb: mocks.db }));
import { DELETE } from "./route";

const site = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const context = { params: Promise.resolve({ websiteId: site }) };
const request = (
  body: unknown, headers: Record<string, string> = {},
) => new Request("https://os.example/api/websites/" + site, {
  method: "DELETE",
  headers: { "content-type": "application/json", origin: "https://os.example", ...headers },
  body: JSON.stringify(body),
});

beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: "verified-user" });
  mocks.members.mockResolvedValue([]);
  mocks.db.mockReturnValue({});
});

describe("Owner-only website removal trust boundary", () => {
  it("requires a verified session", async () => {
    mocks.user.mockResolvedValue(null);
    expect((await DELETE(request({ confirmation: "Site" }), context)).status).toBe(401);
    expect(mocks.db).not.toHaveBeenCalled();
  });
  it("rejects cross-origin deletion before any database access", async () => {
    expect((await DELETE(request({ confirmation: "Site" }, { origin: "https://attacker.example" }), context)).status).toBe(403);
    expect(mocks.db).not.toHaveBeenCalled();
  });
  it("denies a stale account context", async () => {
    expect((await DELETE(request({ confirmation: "Site" }, { "x-lucia-workspace-account": "stale-user" }), context)).status).toBe(409);
    expect(mocks.db).not.toHaveBeenCalled();
  });
  it("rejects invalid website identifiers and missing confirmations", async () => {
    const bad = { params: Promise.resolve({ websiteId: "../staff" }) };
    expect((await DELETE(request({ confirmation: "Site" }), bad)).status).toBe(400);
    expect((await DELETE(request({}), context)).status).toBe(422);
    expect(mocks.db).not.toHaveBeenCalled();
  });
  it("does not treat a normal member or editor as a website owner", async () => {
    mocks.members.mockResolvedValue([{
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      role: "editor", membershipStatus: "active",
    }]);
    expect((await DELETE(request({ confirmation: "Site" }), context)).status).toBe(404);
    expect(mocks.db).toHaveBeenCalledOnce();
  });
});
