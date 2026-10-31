import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), readable: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/media/service", () => ({ findReadableMedia: mocks.readable }));
import { GET } from "./route";
const id = "b8e95a60-fbde-4c37-93e6-a2916c7b13d4", context = { params: Promise.resolve({ id }) };
beforeEach(() => { vi.resetAllMocks(); mocks.user.mockResolvedValue({ id: "owner" }); mocks.readable.mockResolvedValue(null); });
describe("public-host media isolation", () => {
  it("uses the actual customer Host rather than Next's internal URL for private access", async () => {
    const response = await GET(new Request("http://localhost:3000/api/media/" + id, { headers: { host: "customer.lucia.name.ng", cookie: "lucia_os_session=synthetic" } }), context);
    expect(response.status).toBe(404);
    expect(mocks.user).not.toHaveBeenCalled();
    expect(mocks.readable).toHaveBeenCalledWith(id, null);
  });
  it("allows the platform hostname to check the authenticated private owner", async () => {
    await GET(new Request("http://localhost:3000/api/media/" + id, { headers: { host: "os.lucia.name.ng" } }), context);
    expect(mocks.readable).toHaveBeenCalledWith(id, "owner");
  });
});
