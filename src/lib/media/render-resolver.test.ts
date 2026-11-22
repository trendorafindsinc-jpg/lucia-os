import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ resolve: vi.fn() }));
vi.mock("./service", () => ({ getWebsiteMediaForRender: mocks.resolve }));
import { createWebsiteMediaResolver } from "./render-resolver";

describe("website media renderer adapter", () => {
  it("binds resolution to the authenticated user and exact website ID", async () => {
    const asset = { assetId: "asset-id", url: "/_media/asset-id", altText: "A shop", decorative: false, width: 640, height: 480 };
    mocks.resolve.mockResolvedValue(asset);
    const resolver = createWebsiteMediaResolver("user-id");
    await expect(resolver.resolve("asset-id", "website-id")).resolves.toEqual(asset);
    expect(mocks.resolve).toHaveBeenCalledWith("user-id", "website-id", "asset-id");
  });

  it("propagates a missing or unauthorized asset as unavailable", async () => {
    mocks.resolve.mockResolvedValue(null);
    await expect(createWebsiteMediaResolver("user-id").resolve("asset-id", "website-id")).resolves.toBeNull();
  });
});
