import { describe, expect, it } from "vitest";
import { canCloseWorkspaceTab, describeWorkspaceRoute, getWorkspaceTabId, isSafeWorkspaceTabHref } from "./tabs";

describe("workspace tab routing", () => {
  it("gives different website contexts independent editor tabs", () => {
    const first = describeWorkspaceRoute("/editor", "?websiteId=site-a");
    const second = describeWorkspaceRoute("/editor", "?websiteId=site-b");
    expect(first?.appKey).toBe("website-engine");
    expect(getWorkspaceTabId(first!)).not.toBe(getWorkspaceTabId(second!));
  });

  it("restores the selected editor context from its route", () => {
    expect(describeWorkspaceRoute("/editor", "?websiteId=site-a")).toMatchObject({
      href: "/editor?websiteId=site-a",
      context: "website:site-a",
    });
  });

  it("keeps Layouts a separate app and preserves the catalogue route", () => {
    expect(describeWorkspaceRoute("/templates", "")).toMatchObject({
      appKey: "layouts",
      label: "Layouts",
      href: "/templates",
      context: "catalogue",
    });
  });

  it.each([
    ["/pages", "Pages & navigation"],
    ["/content", "Blog & media"],
    ["/create", "Layout Studio setup"],
    ["/workspace/websites", "Websites"],
    ["/workspace/domains?websiteId=site-a", "Domains"],
    ["/publish?websiteId=site-a", "Publishing"],
    ["/analytics?websiteId=site-a", "Analytics"],
    ["/billing", "Plan & billing"],
    ["/forms?websiteId=site-a", "Forms"],
    ["/seo?websiteId=site-a", "SEO"],
    ["/versions?websiteId=site-a", "Versions"],
    ["/support", "Help & support"],
    ["/support/case-123", "Help & support"],
    ["/workspace/team", "Team & access"],
    ["/loom", "Loom"],
  ])("registers the workspace route %s", (href, label) => {
    const url = new URL(href, "https://workspace.invalid");
    expect(describeWorkspaceRoute(url.pathname, url.search)).toMatchObject({ label });
    expect(isSafeWorkspaceTabHref(href)).toBe(true);
  });

  it("keeps website-specific content in separate tabs", () => {
    const pagesA = describeWorkspaceRoute("/pages", "?websiteId=site-a");
    const pagesB = describeWorkspaceRoute("/pages", "?websiteId=site-b");
    const contentA = describeWorkspaceRoute("/content", "?websiteId=site-a");
    expect(getWorkspaceTabId(pagesA!)).not.toBe(getWorkspaceTabId(pagesB!));
    expect(getWorkspaceTabId(pagesA!)).not.toBe(getWorkspaceTabId(contentA!));
  });

  it("does not create app tabs for the launcher or unregistered routes", () => {
    expect(describeWorkspaceRoute("/workspace", "")).toBeNull();
    expect(describeWorkspaceRoute("/not-an-app", "")).toBeNull();
    expect(describeWorkspaceRoute("/staff", "")).toBeNull();
  });

  it("rejects external and unregistered destinations from persisted tab state", () => {
    expect(isSafeWorkspaceTabHref("/editor?websiteId=site-a")).toBe(true);
    expect(isSafeWorkspaceTabHref("https://example.com")).toBe(false);
    expect(isSafeWorkspaceTabHref("//example.com")).toBe(false);
    expect(isSafeWorkspaceTabHref("/admin/unregistered")).toBe(false);
  });

  it("requires confirmation before closing dirty tabs", () => {
    expect(canCloseWorkspaceTab(false, false)).toBe(true);
    expect(canCloseWorkspaceTab(true, false)).toBe(false);
    expect(canCloseWorkspaceTab(true, true)).toBe(true);
  });
});
