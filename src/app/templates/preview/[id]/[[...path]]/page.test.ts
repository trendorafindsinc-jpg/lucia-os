import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ currentUser: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.currentUser }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => { throw new Error(`redirect:${path}`); },
  notFound: () => { throw new Error("not-found"); },
}));
import PreviewPage from "./page";
import { premiumCandidate } from "@/lib/layout-blueprint/premium-layouts/catalogue-candidates";

describe("authenticated canonical Layout previews", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.currentUser.mockResolvedValue({ id: "test-customer" }); });
  it("redirects signed-out users to LUCIA ID with the exact safe local return route", async () => {
    mocks.currentUser.mockResolvedValue(null);
    await expect(PreviewPage({ params: Promise.resolve({ id: "lucia.layout.haven" }) })).rejects.toThrow("redirect:/api/auth/login?returnTo=%2Ftemplates%2Fpreview%2Flucia.layout.haven");
  });
  it.each([{ id: "staff" }, { id: "lucia.layout.haven", path: ["..", "workspace"] }, { id: "lucia.layout.haven", path: ["missing"] }])("rejects unknown destinations %j", async (params) => {
    await expect(PreviewPage({ params: Promise.resolve(params) })).rejects.toThrow("not-found");
  });
  it("renders the registered interior page with the production definition", async () => {
    const definition = premiumCandidate("lucia.layout.haven");
    const pagePath = definition.pages[1].path;
    const result = await PreviewPage({ params: Promise.resolve({ id: definition.layoutId, path: pagePath.slice(1).split("/") }) });
    expect(result.props).toEqual({ blueprint: definition, pagePath });
  });
});
