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
    ["/loomify-ai?websiteId=site-a", "loomifyAI"],
  ])("registers the workspace route %s", (href, label) => {
    const url = new URL(href, "https://workspace.invalid");
    expect(describeWorkspaceRoute(url.pathname, url.search)).toMatchObject({ label });
    expect(isSafeWorkspaceTabHref(href)).toBe(true);
  });

  it("keeps one Layout Studio tab per website context across its routes", () => {
    const pagesA = describeWorkspaceRoute("/pages", "?websiteId=site-a");
    const contentA = describeWorkspaceRoute("/content", "?websiteId=site-a");
    const publishA = describeWorkspaceRoute("/publish", "?websiteId=site-a");
    const pagesB = describeWorkspaceRoute("/pages", "?websiteId=site-b");
    expect(getWorkspaceTabId(pagesA!)).toBe(getWorkspaceTabId(contentA!));
    expect(getWorkspaceTabId(pagesA!)).toBe(getWorkspaceTabId(publishA!));
    expect(getWorkspaceTabId(pagesA!)).not.toBe(getWorkspaceTabId(pagesB!));
  });

  it("shares the Layout Studio library tab across routes without a selected website", () => {
    const pages = describeWorkspaceRoute("/pages", "");
    const content = describeWorkspaceRoute("/content", "");
    const websites = describeWorkspaceRoute("/workspace/websites", "");
    expect(getWorkspaceTabId(pages!)).toBe(getWorkspaceTabId(content!));
    expect(getWorkspaceTabId(pages!)).toBe(getWorkspaceTabId(websites!));
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
