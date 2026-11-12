import { beforeEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  members: vi.fn(),
  db: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/access/guards", () => ({
  getOrganizationMembershipsForUser: mocks.members,
}));
vi.mock("@/lib/db/client", () => ({ getDb: mocks.db }));
import { GET, PATCH } from "./route";
import { makeInitialDraft } from "@/lib/editor/site-draft";
const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const context = { params: Promise.resolve({ websiteId: id }) };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: "verified-account" });
  mocks.members.mockResolvedValue([]);
  mocks.db.mockReturnValue({});
});
const request = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("https://os.example/api/websites/" + id + "/draft", {
    method: "PATCH",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
describe("editor continuity server trust boundary", () => {
  it("denies signed-out load and save", async () => {
    mocks.user.mockResolvedValue(null);
    expect((await GET(new Request("https://os.example"), context)).status).toBe(
      401,
    );
    expect((await PATCH(request({}), context)).status).toBe(401);
    expect(mocks.db).not.toHaveBeenCalled();
  });
  it("rejects a changed authenticated account before any resource or database operation", async () => {
    expect(
      (
        await PATCH(
          request(makeInitialDraft("northstar-consulting"), {
            "x-lucia-workspace-account": "previous-account",
          }),
          context,
        )
      ).status,
    ).toBe(409);
    expect(mocks.db).not.toHaveBeenCalled();
  });
  it("rejects invalid resource context on GET and PATCH", async () => {
    const invalid = { params: Promise.resolve({ websiteId: "../../staff" }) };
    expect((await GET(new Request("https://os.example"), invalid)).status).toBe(
      400,
    );
    expect((await PATCH(request({}), invalid)).status).toBe(400);
  });
  it("does not grant read access from a valid cached resource identifier", async () => {
    expect((await GET(new Request("https://os.example"), context)).status).toBe(
      404,
    );
    expect(mocks.members).toHaveBeenCalledWith("verified-account");
  });
  it("does not grant write access from a valid cached draft", async () =>
    expect(
      (await PATCH(request(makeInitialDraft("northstar-consulting")), context))
        .status,
    ).toBe(404));
  it("keeps incomplete draft recovery separate from server validation", async () =>
    expect(
      (
        await PATCH(
          request({
            ...makeInitialDraft("northstar-consulting"),
            siteName: "",
          }),
          context,
        )
      ).status,
    ).toBe(422));
});
