import { describe, expect, it } from "vitest";
import { applyDesktopRequest, createDesktopState, describeDesktopApp, restoreDesktopState, sameDesktopContext } from "./desktop";
import { openWorkspaceTab } from "./tabs";

describe("desktop split capability and recovery", () => {
  it("allows only native pane adapters and safe app context fields", () => {
    expect(describeDesktopApp("/templates")?.appKey).toBe("layouts");
    expect(describeDesktopApp("/editor?websiteId=site-a")?.context).toBe("website:site-a");
    for(const href of [null, 42, {}, "https://example.com/editor","//example.com/editor","/editor?role=admin","/editor?websiteId=a&websiteId=b","/api/auth/me","/staff","/loomify-ai","/editor#bad","/templates?token=private","/editor?websiteId=../../x","/\\evil.test/editor"]) expect(describeDesktopApp(href),String(href)).toBeNull();
  });
  it("does not permit concurrent editors for the same saved website", () => {
    expect(sameDesktopContext("/editor?websiteId=site-a", "/editor?websiteId=site-a&template=northstar")).toBe(true);
    expect(sameDesktopContext("/editor?websiteId=site-a", "/editor?websiteId=site-b")).toBe(false);
    expect(sameDesktopContext("/templates", "/editor")).toBe(false);
  });
  it("restores only the authenticated account's versioned state", () => {
    const state=createDesktopState("user-a","/editor?websiteId=site-a");
    state.panes[0].dirty=true;state.panes[0].snapshots["editor-draft:website-engine:website:site-a"]={siteName:"Recover me"};
    expect(restoreDesktopState(state,"user-a")).toEqual(state);
    expect(restoreDesktopState(state,"user-b")).toBeNull();
    expect(restoreDesktopState({...state,version:2},"user-a")).toBeNull();
  });
  it("rejects corrupt state and untrusted pane destinations", () => {
    for(const value of [null,[],"x",{version:1,userId:"a",panes:[]}]) expect(restoreDesktopState(value,"a")).toBeNull();
    const state=createDesktopState("a");state.panes[1].href="/api/auth/me";
    expect(restoreDesktopState(state,"a")).toBeNull();
  });
  it("keeps a usable app and clamps pane balance on restore", () => {
    const state=createDesktopState("a");
    expect(restoreDesktopState({...state,ratio:999},"a")?.ratio).toBe(55);
    expect(restoreDesktopState({...state,ratio:NaN},"a")).toBeNull();
    state.panes.forEach(pane=>pane.open=false);expect(restoreDesktopState(state,"a")).toBeNull();
  });
  it("falls back to supported apps for an invalid initial request", () => {
    expect(createDesktopState("a","https://evil.test").panes[0].href).toBe("/editor");
    expect(createDesktopState("a","/templates").panes[1].href).toBe("/editor");
  });
  it("honors explicit app launches without replacing an unsaved pane", () => {
    const state=createDesktopState("a","/editor?websiteId=site-a");state.panes[0].dirty=true;
    const next=applyDesktopRequest(state,"/editor?websiteId=site-b");
    expect(next.panes[0].href).toBe("/editor?websiteId=site-a");
    expect(next.panes[1].href).toBe("/editor?websiteId=site-b");
    expect(next.active).toBe("second");
  });
  it("keeps both unsaved panes and focuses already-open contexts", () => {
    const state=createDesktopState("a","/editor?websiteId=site-a");state.panes.forEach(pane=>pane.dirty=true);
    expect(applyDesktopRequest(state,"/editor?websiteId=site-b")).toBe(state);
    expect(applyDesktopRequest(state,"/templates").active).toBe("second");
  });

});

describe("desktop tab lifecycle", () => {
  it("updates an existing app context without duplicating it", () => {
    expect(openWorkspaceTab([{id:"a",dirty:true}],{id:"a",dirty:true})).toEqual([{id:"a",dirty:true}]);
  });
  it("evicts only a clean tab when reaching the preferred limit", () => {
    expect(openWorkspaceTab([{id:"dirty",dirty:true},{id:"clean",dirty:false}],{id:"new",dirty:false},2).map(tab=>tab.id)).toEqual(["dirty","new"]);
  });
  it("retains every unsaved tab even when all slots are occupied", () => {
    expect(openWorkspaceTab([{id:"a",dirty:true},{id:"b",dirty:true}],{id:"c",dirty:true},2).map(tab=>tab.id)).toEqual(["a","b","c"]);
  });
});
