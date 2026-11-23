import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ currentUser: vi.fn(), list: vi.fn(), upload: vi.fn(), update: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.currentUser }));
vi.mock("@/lib/media/service", async (original) => ({ ...(await original<typeof import("@/lib/media/service")>()), listMedia: mocks.list, uploadMedia: mocks.upload, updateMediaMetadata: mocks.update }));
import { GET, POST, PATCH } from "./route";
const context = { params: Promise.resolve({ websiteId: "a660ce01-079a-4409-a9e0-c5eb30c699b9" }) };
beforeEach(() => { vi.resetAllMocks(); mocks.currentUser.mockResolvedValue({ id: "customer-a" }); });
describe("customer media request guards", () => {
  it("denies signed-out access without opening the library", async () => {
    mocks.currentUser.mockResolvedValue(null);
    expect((await GET(new Request("https://os.lucia.name.ng/api/media"), context)).status).toBe(401);
    expect(mocks.list).not.toHaveBeenCalled();
  });
  it("rejects cross-account requests before reading data", async () => {
    expect((await GET(new Request("https://os.lucia.name.ng/api/media", { headers: { "x-lucia-workspace-account": "customer-b" } }), context)).status).toBe(409);
    expect(mocks.list).not.toHaveBeenCalled();
  });
  it("passes bounded search and supported filters to the tenant-scoped service", async () => {
    mocks.list.mockResolvedValue({ items: [] });
    const response = await GET(new Request("https://os.lucia.name.ng/api/media?q=summer%20banner&kind=image&status=ready"), context);
    expect(response.status).toBe(200);
    expect(mocks.list).toHaveBeenCalledWith("customer-a", "a660ce01-079a-4409-a9e0-c5eb30c699b9", {
      query: "summer banner", kind: "image", status: "ready",
    });
  });
  it("rejects unsupported media filters", async () => {
    const response = await GET(new Request("https://os.lucia.name.ng/api/media?kind=executable"), context);
    expect(response.status).toBe(400);
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it("validates and saves media metadata through the tenant-scoped service", async () => {
    mocks.update.mockResolvedValue({ id: "a660ce01-079a-4409-a9e0-c5eb30c699b9", alt: "Summer banner", caption: "Summer collection" });
    const response = await PATCH(new Request("https://os.lucia.name.ng/api/media", { method: "PATCH", headers: { "content-type": "application/json", origin: "https://os.lucia.name.ng" }, body: JSON.stringify({ id: "a660ce01-079a-4409-a9e0-c5eb30c699b9", alt: "Summer banner", caption: "Summer collection" }) }), context);
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith("customer-a", "a660ce01-079a-4409-a9e0-c5eb30c699b9", "a660ce01-079a-4409-a9e0-c5eb30c699b9", { alt: "Summer banner", caption: "Summer collection" });
  });
  it("rejects cross-origin uploads before consuming their body", async () => {
    expect((await POST(new Request("https://os.lucia.name.ng/api/media", { method: "POST", headers: { origin: "https://evil.test" }, body: "bad" }), context)).status).toBe(403);
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});
