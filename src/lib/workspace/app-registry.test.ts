import { describe, expect, it } from "vitest";
import { getWorkspaceApp, WORKSPACE_APPS, WORKSPACE_TOOLS } from "./app-registry";

describe("workspace app registry", () => {
  it("routes the Layout Studio entry to the website library", () => {
    expect(getWorkspaceApp("website-engine")).toMatchObject({
      label: "Layout Studio",
      href: "/workspace/websites",
      status: "available",
    });
  });

  it("keeps Layouts, loomifyAI, and Loom as distinct workspace apps", () => {
    expect(getWorkspaceApp("layouts")).toMatchObject({ label: "Layouts", href: "/templates", status: "available" });
    expect(getWorkspaceApp("loomify-ai")).toMatchObject({ label: "loomifyAI", href: "/loomify-ai", status: "available" });
    expect(getWorkspaceApp("loom")).toMatchObject({ label: "Loom", status: "unavailable" });
    expect(getWorkspaceApp("loom")?.href).toBeUndefined();
  });

  it("keeps only implemented v1 apps launchable", () => {
    for (const key of ["store"]) {
      const app = getWorkspaceApp(key);
      expect(app?.status).toBe("unavailable");
      expect(app?.href).toBeUndefined();
      expect(app?.reason).toBeTruthy();
    }
  });

  it("does not list Portals or Business Admin as launcher apps", () => {
    expect(getWorkspaceApp("portals")).toBeUndefined();
    expect(getWorkspaceApp("business-admin")).toBeUndefined();
  });

  it("uses unique stable app keys and labels", () => {
    expect(new Set(WORKSPACE_APPS.map((app) => app.key)).size).toBe(WORKSPACE_APPS.length);
    expect(new Set(WORKSPACE_APPS.map((app) => app.label)).size).toBe(WORKSPACE_APPS.length);
  });

  it("only links workspace tools to established destinations", () => {
    expect(WORKSPACE_TOOLS.map((tool) => tool.href)).toEqual([
      "/workspace/websites",
      "/workspace/domains",
      "/workspace/team",
      "/support",
    ]);
  });

  it("returns undefined for an unknown app key", () => {
    expect(getWorkspaceApp("not-a-real-app")).toBeUndefined();
  });
});
