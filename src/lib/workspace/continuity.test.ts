import { describe, it, expect } from "vitest";
import {
  ContextLease,
  addContinuityTab,
  discardTabSnapshots,
  lifecycleFor,
  migrateLegacyRecovery,
  readRecovery,
  resolveContinuityRoute,
  validateSnapshot,
  validateSnapshots,
  MAX_RECOVERY_BYTES,
  RECOVERY_TTL,
  type ContinuityTab,
} from "./continuity";
import { createDesktopState } from "./desktop";
import { makeInitialDraft } from "@/lib/editor/site-draft";
import { DEFAULT_PREFERENCES } from "./preferences";
import { isBoundedRecoveryJson } from "./recovery-json";
const now = Date.now();
const tab = (href: string, dirty = false): ContinuityTab => {
  const r = resolveContinuityRoute(href)!;
  return { ...r, id: `${r.appKey}:${r.context}`, dirty };
};
const draft = makeInitialDraft("northstar-consulting");
const envelope = (ownerId = "user-a") => ({
  version: 2,
  ownerId,
  revision: 4,
  updatedAt: now,
  tabs: [tab("/editor?websiteId=site-a", true)],
  snapshots: { "editor-draft:website-engine:website:site-a": draft },
});
describe("workspace continuity trust and recovery", () => {
  it("reconstructs identity from validated route, ignoring browser labels and permissions", () => {
    const e = envelope();
    Object.assign(e.tabs[0], {
      id: "staff:root",
      label: "Superuser",
      role: "admin",
    });
    const restored = readRecovery(JSON.stringify(e), "user-a", now)!;
    expect(restored.tabs[0]).toMatchObject({
      id: "website-engine:website:site-a",
      label: "Layout Studio editor",
      dirty: true,
    });
    expect(restored.tabs[0]).not.toHaveProperty("role");
  });
  it("rejects another authenticated account and unsupported versions", () => {
    expect(readRecovery(JSON.stringify(envelope()), "user-b", now)).toBeNull();
    expect(
      readRecovery(
        JSON.stringify({ ...envelope(), version: 99 }),
        "user-a",
        now,
      ),
    ).toBeNull();
  });
  it.each([null, "{broken", "null", "[]", "true"])(
    "handles malformed storage %s",
    (raw) => expect(readRecovery(raw, "user-a", now)).toBeNull(),
  );
  it("rejects expired, future, invalid revision and oversized envelopes", () => {
    for (const patch of [
      { updatedAt: now - RECOVERY_TTL - 1 },
      { updatedAt: now + 120000 },
      { revision: -1 },
      { tabs: Array.from({ length: 25 }, () => tab("/templates")) },
    ])
      expect(
        readRecovery(
          JSON.stringify({ ...envelope(), ...patch }),
          "user-a",
          now,
        ),
      ).toBeNull();
    expect(
      readRecovery("a".repeat(MAX_RECOVERY_BYTES + 1), "user-a", now),
    ).toBeNull();
  });
  it("rejects executable, cyclic, prototype and excessively nested values", () => {
    const recursive: unknown[] = [];
    recursive.push(recursive);
    for (const v of [
      () => {},
      new Date(),
      recursive,
      JSON.parse('{"__proto__":{"admin":true}}'),
      { constructor: { admin: true } },
      JSON.parse('{"x":{"prototype":true}}'),
    ])
      expect(isBoundedRecoveryJson(v)).toBe(false);
  });
  it("keeps temporarily invalid editor text for recovery while API save validation stays strict", () => {
    expect(
      validateSnapshot(
        "editor-draft:website-engine:website:site-a",
        { ...draft, siteName: "", headline: "" },
        "user-a",
      ),
    ).toMatchObject({ siteName: "", headline: "" });
  });
  it("rejects invalid snapshot kinds, unknown templates and unsafe snapshot keys", () => {
    expect(validateSnapshot("__proto__", draft, "user-a")).toBeUndefined();
    expect(
      validateSnapshot("editor-draft:staff:root", draft, "user-a"),
    ).toBeUndefined();
    expect(
      validateSnapshot(
        "editor-draft:website-engine:website:site-a",
        { ...draft, templateId: "missing" },
        "user-a",
      ),
    ).toBeUndefined();
  });
  it("isolates website snapshots and clears only the closed inactive tab", () => {
    const a = "editor-draft:website-engine:website:site-a",
      b = "editor-draft:website-engine:website:site-b";
    const values = {
      [a]: draft,
      [b]: { ...draft, siteName: "Second website" },
    };
    expect(
      validateSnapshots(values, "user-a", "website-engine:website:site-b"),
    ).toEqual({ [b]: values[b] });
    expect(
      discardTabSnapshots(values, "website-engine:website:site-a"),
    ).toEqual({ [b]: values[b] });
  });
  it("strips orphan snapshots and planned/unsafe recovered apps", () => {
    const e = envelope();
    e.tabs.push({ ...tab("/templates"), href: "/staff" });
    const parsed = readRecovery(
      JSON.stringify({
        ...e,
        snapshots: {
          ...e.snapshots,
          "layouts-filter:layouts:catalogue": {
            category: "All",
            search: "private",
          },
        },
      }),
      "user-a",
      now,
    )!;
    expect(parsed.tabs).toHaveLength(1);
    expect(Object.keys(parsed.snapshots)).toHaveLength(1);
    for (const href of [
      "/staff",
      "/staff/team",
      "//evil.test",
      "https://evil.test",
      "/editor?websiteId=a&websiteId=b",
      "/loom",
    ])
      expect(resolveContinuityRoute(href)).toBeNull();
  });
  it("validates Layouts and Settings adapter formats", () => {
    expect(
      validateSnapshot(
        "layouts-filter:layouts:catalogue",
        { category: "All", search: "school" },
        "user-a",
      ),
    ).toEqual({ category: "All", search: "school" });
    expect(
      validateSnapshot(
        "layouts-filter:layouts:catalogue",
        { category: "invented", search: "x" },
        "user-a",
      ),
    ).toBeUndefined();
    expect(
      validateSnapshot(
        "settings-draft:settings:account",
        {
          draft: DEFAULT_PREFERENCES,
          baseline: DEFAULT_PREFERENCES,
          revision: 3,
        },
        "user-a",
      ),
    ).toHaveProperty("revision", 3);
  });
  it("restores only native Lattice pane adapters and bounds ratios", () => {
    const state = createDesktopState("user-a");
    state.ratio = 99;
    state.panes[0].snapshots = {
      "editor-draft:website-engine:template:new": draft,
      "editor-draft:website-engine:website:foreign": draft,
    };
    const restored = validateSnapshot(
      "desktop-state:desktop:home",
      state,
      "user-a",
    ) as typeof state;
    expect(restored.ratio).toBe(55);
    expect(Object.keys(restored.panes[0].snapshots)).toEqual([
      "editor-draft:website-engine:template:new",
    ]);
    state.panes[0].href = "/workspace/settings";
    expect(
      validateSnapshot("desktop-state:desktop:home", state, "user-a"),
    ).toBeUndefined();
  });
  it("migrates attributable legacy Lattice but never imports global unowned editor drafts", () => {
    const tabs = JSON.stringify([
      tab("/workspace/desktop"),
      tab("/editor?websiteId=site-a"),
    ]);
    const values = JSON.stringify({
      "desktop-state:desktop:home": createDesktopState("user-a"),
      "editor-draft:website-engine:website:site-a": draft,
    });
    expect(
      migrateLegacyRecovery(tabs, values, "user-a", now)?.tabs.map((t) => t.id),
    ).toEqual(["desktop:home"]);
    expect(migrateLegacyRecovery(tabs, values, "user-b", now)).toBeNull();
    expect(
      migrateLegacyRecovery(
        tabs,
        JSON.stringify({ "editor-draft:website-engine:website:site-a": draft }),
        "user-a",
        now,
      ),
    ).toBeNull();
  });
});
describe("tab lifecycle and bounded allocation", () => {
  it("activates existing logical contexts without duplicating them or losing dirty state", () => {
    const a = tab("/editor?websiteId=a", true);
    const next = addContinuityTab([a], tab("/pages?websiteId=a"));
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ href: "/pages?websiteId=a", dirty: true });
  });
  it("evicts the first clean tab deterministically while preserving dirty tabs", () => {
    const tabs = Array.from({ length: 12 }, (_, i) =>
      tab("/editor?websiteId=site" + i, i !== 4),
    );
    const next = addContinuityTab(tabs, tab("/templates"));
    expect(next).toHaveLength(12);
    expect(next.some((t) => t.id === tabs[4].id)).toBe(false);
    expect(next.filter((t) => t.dirty)).toHaveLength(11);
  });
  it("does not evict dirty tabs at either limit", () => {
    const tabs = Array.from({ length: 24 }, (_, i) =>
      tab("/editor?websiteId=site" + i, true),
    );
    expect(addContinuityTab(tabs, tab("/templates"))).toBe(tabs);
  });
  it("distinguishes active, inactive and recoverable lifecycle states honestly", () => {
    const t = tab("/templates");
    expect(lifecycleFor(t, t.id, true)).toBe("active");
    expect(lifecycleFor(t, null, true)).toBe("recoverable");
    expect(lifecycleFor(t, null, false)).toBe("inactive");
  });
});

describe("asynchronous context leases", () => {
  it("invalidates a closed or replaced context before a late save completes", () => {
    const lease = new ContextLease();
    const first = lease.start();
    lease.cancel(first);
    const second = lease.start();
    expect(lease.matches(first)).toBe(false);
    expect(lease.matches(second)).toBe(true);
  });
  it("an old cleanup cannot invalidate the next context", () => {
    const lease = new ContextLease();
    const old = lease.start();
    const current = lease.start();
    lease.cancel(old);
    expect(lease.matches(current)).toBe(true);
  });
});
