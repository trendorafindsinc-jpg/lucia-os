import { describe, expect, it } from "vitest";
import { canCloseWorkspaceTab, describeWorkspaceRoute, getWorkspaceTabId } from "./tabs";

describe("workspace tab routing", () => {
  it("gives different website contexts independent editor tabs", () => {
    const first = describeWorkspaceRoute("/editor", "?websiteId=site-a");
    const second = describeWorkspaceRoute("/editor", "?websiteId=site-b");
    expect(first?.appKey).toBe("website-editor");
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

  it("does not create app tabs for unregistered routes", () => {
    expect(describeWorkspaceRoute("/workspace", "")).toBeNull();
    expect(describeWorkspaceRoute("/not-an-app", "")).toBeNull();
  });

  it("requires confirmation before closing dirty tabs", () => {
    expect(canCloseWorkspaceTab(false, false)).toBe(true);
    expect(canCloseWorkspaceTab(true, false)).toBe(false);
    expect(canCloseWorkspaceTab(true, true)).toBe(true);
  });
});
