import { describe, it, expect, vi } from "vitest";
import {
  DEFAULT_PREFERENCES,
  preferencesSchema,
  migrateLegacy,
  resolveOrganization,
  safeWallpaperData,
  validateWallpaper,
  formatWorkspaceDate,
} from "./preferences";
import { describeWorkspaceRoute, isSafeWorkspaceTabHref } from "./tabs";
import { getWorkspaceApp } from "./app-registry";
describe("account preference contract", () => {
  it("defaults to system, accessible effects and library-first apps", () => {
    expect(DEFAULT_PREFERENCES).toMatchObject({
      theme: "system",
      motion: "system",
      transparency: "system",
      showHomeApps: false,
      preferredOrganizationId: null,
    });
  });
  it.each(["light", "dark", "system"])("persists theme %s", (theme) =>
    expect(preferencesSchema.parse({ theme }).theme).toBe(theme),
  );
  it.each([
    { theme: "purple" },
    { wallpaper: "https://evil.test" },
    { wallpaper: "data:image/svg+xml,x" },
    { homeApps: ["staff"] },
    { homeApps: ["store"] },
    { homeApps: ["layouts", "layouts"] },
    { preferredOrganizationId: "other" },
    { timeZone: "Moon/Base" },
    { motion: "animate" },
  ])("rejects unsupported preference %j", (p) =>
    expect(preferencesSchema.safeParse(p).success).toBe(false),
  );
  it("strips unknown fields including authentication and prototype keys", () => {
    const p = preferencesSchema.parse(
      JSON.parse('{"__proto__":{"admin":true},"token":"secret","staff":true}'),
    );
    expect(Object.hasOwn(p, "__proto__")).toBe(false);
    expect("token" in p).toBe(false);
    expect({}).not.toHaveProperty("admin");
  });
  it("preserves valid legacy wallpaper and Home choice", () =>
    expect(
      migrateLegacy(
        JSON.stringify({
          wallpaper: "ocean",
          showHomeApps: true,
          custom: "private",
          theme: "unknown",
        }),
      ),
    ).toEqual({ wallpaper: "ocean", showHomeApps: true }));
  it.each([
    null,
    "{bad",
    "null",
    "[]",
    '"x"',
    JSON.stringify({ wallpaper: "invalid" }),
  ])("recovers corrupt legacy %s", (raw) =>
    expect(migrateLegacy(raw)).toBeNull(),
  );
  it("never imports private image bytes into account contract", () =>
    expect(
      migrateLegacy(
        JSON.stringify({
          wallpaper: "custom",
          custom: "data:image/png;base64,YQ==",
          showHomeApps: false,
        }),
      ),
    ).toEqual({ showHomeApps: false }));
  it("preserves icon order while rejecting invented entries", () =>
    expect(
      preferencesSchema.parse({ homeApps: ["loomify-ai", "layouts"] }).homeApps,
    ).toEqual(["loomify-ai", "layouts"]));
  it("rejects active image formats, URLs, oversize and unsafe data", () => {
    for (const v of [
      "data:image/svg+xml;base64,YQ==",
      "javascript:alert(1)",
      "https://evil.test/a.png",
      "data:image/png;base64," + "A".repeat(1_300_000),
    ])
      expect(safeWallpaperData(v)).toBe(false);
  });
  it("rejects MIME/size/signature before decoding", async () => {
    await expect(
      validateWallpaper(
        new File(["<svg/>"], "x.svg", { type: "image/svg+xml" }),
      ),
    ).rejects.toThrow();
    await expect(
      validateWallpaper(new File(["fake"], "x.png", { type: "image/png" })),
    ).rejects.toThrow(/content/);
  });
  it("rejects an image whose decoder fails", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockRejectedValue(Error("decode")),
    );
    await expect(
      validateWallpaper(
        new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], "x.png", {
          type: "image/png",
        }),
      ),
    ).rejects.toThrow("decode");
    vi.unstubAllGlobals();
  });
  it("handles zero, one, multiple and revoked organization context", () => {
    const orgs = [{ id: "a" }, { id: "b" }];
    expect(resolveOrganization([], "a")).toBeNull();
    expect(resolveOrganization([orgs[0]], null)?.id).toBe("a");
    expect(resolveOrganization(orgs, "b")?.id).toBe("b");
    expect(resolveOrganization(orgs, "revoked")?.id).toBe("a");
  });
  it("uses the single settings route on every device and supports deep links", () => {
    expect(getWorkspaceApp("settings")?.capabilities.modes).toEqual([
      "mobile",
      "tablet",
      "desktop",
    ]);
    expect(
      describeWorkspaceRoute("/workspace/settings", "?category=organizations")
        ?.appKey,
    ).toBe("settings");
    expect(isSafeWorkspaceTabHref("/workspace/settings?category=home")).toBe(
      true,
    );
    expect(isSafeWorkspaceTabHref("/staff")).toBe(false);
  });
  it("applies date format, timezone and clock preference", () => {
    const p = {
      ...DEFAULT_PREFERENCES,
      timeZone: "Africa/Lagos",
      timeFormat: "24" as const,
      dateFormat: "iso" as const,
    };
    expect(formatWorkspaceDate(new Date("2026-10-30T00:00:00Z"), p)).toBe(
      "2026-10-30 · 01:00",
    );
  });
});
