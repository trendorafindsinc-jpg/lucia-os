import { describe, expect, it } from "vitest";
import {
  WORKSPACE_APPS, createAppRegistry, getWorkspaceApp, getAppAvailability,
  getInstalledAppAvailability, isCanonicalAppDestination, type CanonicalAppHref,
} from "./app-registry";
import { LATTICE_APPS, NATIVE_PANE_ADAPTERS, describeDesktopApp, applyDesktopRequest, createDesktopState, restoreDesktopState } from "./desktop";
import { describeWorkspaceRoute, getWorkspaceTabId, recoverWorkspaceTabs, isSafeWorkspaceTabHref } from "./tabs";

describe("Phase 7 canonical workspace registry", () => {
  it("has stable unique IDs and complete original icon metadata", () => {
    expect(new Set(WORKSPACE_APPS.map(app => app.id)).size).toBe(WORKSPACE_APPS.length);
    expect(WORKSPACE_APPS.every(app => app.id === app.key && app.description && app.label && app.iconAsset.kind === "lucia-svg" && app.iconAsset.name === app.icon)).toBe(true);
  });
  it("rejects duplicate registration without tying identity to a mutable label", () => {
    const app = getWorkspaceApp("layouts")!;
    expect(() => createAppRegistry([app, {...app, label:"Renamed app"}])).toThrow(/duplicate/);
    expect(createAppRegistry([{...app,label:"My layouts"}])[0].id).toBe(app.id);
  });
  it("rejects unsafe, empty, or fabricated launches", () => {
    const app = getWorkspaceApp("layouts")!;
    for (const href of ["https://evil.test","//evil.test","/staff","/templates?admin=true","/\\evil.test","/"]) {
      expect(isCanonicalAppDestination(href)).toBe(false);
      expect(() => createAppRegistry([{...app, href:href as CanonicalAppHref, launch:{kind:"route" as const,href:href as CanonicalAppHref}}])).toThrow();
    }
    expect(() => createAppRegistry([{...app,iconAsset:{kind:"lucia-svg",name:"store"}}])).toThrow();
    expect(getWorkspaceApp("nonexistent")).toBeUndefined();
  });
  it("separates disabled, local, and functional route entries", () => {
    expect(getWorkspaceApp("loom")?.availability).toBe("planned");
    expect(getWorkspaceApp("store")?.launch.kind).toBe("none");
    expect(getWorkspaceApp("settings")?.launch).toEqual({kind:"local",action:"open-settings"});
    expect(getWorkspaceApp("settings")?.href).toBeUndefined();
    expect(WORKSPACE_APPS.filter(app => app.status==="available" && app.launch.kind==="route")
      .map(app=>app.id)).toEqual(["overview","website-engine","layouts","loomify-ai"]);
  });
  it("distinguishes runtime mode, configuration and authorization from public metadata", () => {
    const settings = getWorkspaceApp("settings")!;
    expect(getAppAvailability(settings,"mobile")).toBe("built-in-available");
    expect(getAppAvailability(settings,"desktop")).toBe("unsupported-mode");
    const layouts = getWorkspaceApp("layouts")!;
    expect(getAppAvailability(layouts,"desktop",{configured:false})).toBe("configuration-required");
    expect(getAppAvailability(layouts,"desktop",{authorized:false})).toBe("access-denied");
    expect(getAppAvailability(getWorkspaceApp("store")!,"desktop")).toBe("planned");
  });
  it("denies missing or cross-tenant installation summaries by default", () => {
    const installation = {installationId:"installation-a", tenantId:"tenant-a", appId:"client-app", productId:"niche-software", versionId:"niche-software-1",authorized:true as const};
    expect(getInstalledAppAvailability(null,"tenant-a")).toBe("not-installed");
    expect(getInstalledAppAvailability(installation,"tenant-b")).toBe("access-denied");
    expect(getInstalledAppAvailability(installation,"tenant-a")).toBe("installed-authorized");
  });
  it("keeps the native Lattice adapter allowlist separate from the capability flag", () => {
    expect(LATTICE_APPS.map(app=>app.key)).toEqual(["website-engine","layouts"]);
    expect(NATIVE_PANE_ADAPTERS.map(adapter=>adapter.href)).toEqual(["/editor","/templates"]);
    expect(LATTICE_APPS.every(app=>getWorkspaceApp(app.key)?.capabilities.split && describeDesktopApp(app.href)?.appKey===app.key)).toBe(true);
    expect(describeDesktopApp("/loomify-ai")).toBeNull();
    expect(describeDesktopApp("/editor?websiteId=valid-a")?.context).toBe("website:valid-a");
    expect(describeDesktopApp("/editor?websiteId=site-a&websiteId=site-b")).toBeNull();
  });
  it("recovers tabs from canonical routes, not browser-controlled identity or entitlement claims", () => {
    const restored = recoverWorkspaceTabs([
      {id:"staff:admin",appKey:"store",label:"Staff superuser",href:"/editor?websiteId=site-a",dirty:true,entitlement:"paid"},
      {id:"other",href:"/editor?websiteId=site-a",dirty:false},
      {id:"loom",href:"/loom",dirty:true},
      {id:"external",href:"//example.com",dirty:false},
      {id:"bad",href:"/editor?websiteId=x&websiteId=y",dirty:true},
    ]);
    expect(restored).toHaveLength(1);
    expect(restored[0]).toMatchObject({id:"website-engine:website:site-a",appKey:"website-engine",label:"Layout Studio editor",dirty:true});
    expect("entitlement" in restored[0]).toBe(false);
  });
  it("preserves canonical tab contexts, safety and dirty Lattice pane recovery", () => {
    expect(describeWorkspaceRoute("/templates","")?.appKey).toBe(getWorkspaceApp("layouts")?.id);
    expect(getWorkspaceTabId(describeWorkspaceRoute("/editor","?websiteId=tenant-a")!)).toBe("website-engine:website:tenant-a");
    expect(isSafeWorkspaceTabHref("/editor?websiteId=abc")).toBe(true);
    expect(isSafeWorkspaceTabHref("/workspace/desktop?app=%2Feditor")).toBe(true);
    expect(isSafeWorkspaceTabHref("/workspace/desktop?app=%2Feditor%3FwebsiteId%3Dsite-a")).toBe(true);
    expect(isSafeWorkspaceTabHref("/workspace/desktop?app=https%3A%2F%2Fevil.test")).toBe(false);
    for(const value of ["https://evil.test", "//evil.test","/staff", "/editor#frag", "/editor?websiteId=a&websiteId=b", "/editor?websiteId=../../staff"]) expect(isSafeWorkspaceTabHref(value)).toBe(false);
    const state=createDesktopState("user-a","/editor?websiteId=site-a");
    state.panes[0].dirty=true;
    state.panes[1].dirty=true;
    expect(applyDesktopRequest(state,"/editor?websiteId=site-b")).toBe(state);
    expect(restoreDesktopState(state,"user-a")?.panes[0].dirty).toBe(true);
    expect(restoreDesktopState(state,"user-b")).toBeNull();
  });
});
