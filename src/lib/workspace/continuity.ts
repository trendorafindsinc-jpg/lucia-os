import { siteDraftRecoverySchema } from "@/lib/editor/site-draft";
import { preferencesSchema } from "./preferences";
import { templateCategories } from "@/lib/templates/catalogue";
import {
  describeWorkspaceRoute,
  getWorkspaceTabId,
  isSafeWorkspaceTabHref,
  recoverWorkspaceTabs,
  type WorkspaceRoute,
} from "./tabs";
import { describeDesktopApp, restoreDesktopState } from "./desktop";
import { getWorkspaceApp } from "./app-registry";
import { isBoundedRecoveryJson } from "./recovery-json";

export const RECOVERY_VERSION = 2;
export const MAX_RECOVERY_BYTES = 1_500_000;
export const MAX_RECOVERY_TABS = 24;
export const RECOVERY_TTL = 12 * 60 * 60 * 1000;
export type Lifecycle = "active" | "inactive" | "recoverable";
export type ContinuityTab = WorkspaceRoute & { id: string; dirty: boolean };
export type RecoveryEnvelope = {
  version: 2;
  ownerId: string;
  revision: number;
  updatedAt: number;
  tabs: ContinuityTab[];
  snapshots: Record<string, unknown>;
};
export type ApplicationAdapter = {
  save?: () => Promise<boolean>;
  canSuspend: () => boolean;
  discard: () => void;
};
export type TransitionState =
  "idle" | "confirming" | "saving" | "navigating" | "failed";
export type ApplicationContinuity = {
  version: 1;
  identity: string;
  appId: string;
  route: string;
  resourceId: string | null;
  organizationId: string | null;
  state: Lifecycle;
  dirty: boolean;
  recovery: "none" | "session";
  persistence: "unconfirmed" | "server-confirmed";
  access: "unverified" | "denied";
};
export function recoveryStorageKey(ownerId: string) {
  return `lucia.workspace.recovery.v2:${ownerId}`;
}
export function resolveContinuityRoute(href: unknown): WorkspaceRoute | null {
  if (typeof href !== "string" || !isSafeWorkspaceTabHref(href)) return null;
  const url = new URL(href, "https://workspace.invalid");
  const route = describeWorkspaceRoute(url.pathname, url.search);
  if (!route || getWorkspaceApp(route.appKey)?.status === "unavailable")
    return null;
  return route;
}
export function canNavigateWorkspace(href: string) {
  return href === "/workspace" || resolveContinuityRoute(href) !== null;
}
export function lifecycleFor(
  tab: ContinuityTab,
  activeId: string | null,
  recoverable: boolean,
): Lifecycle {
  return tab.id === activeId
    ? "active"
    : recoverable
      ? "recoverable"
      : "inactive";
}
export function validateSnapshot(
  key: string,
  value: unknown,
  ownerId: string,
): unknown | undefined {
  if (!isBoundedRecoveryJson(value)) return undefined;
  const suffix = key.slice(key.indexOf(":") + 1);
  if (key.startsWith("editor-draft:")) {
    if (
      !/^website-engine:(website:[a-zA-Z0-9_-]{1,128}|template:[a-zA-Z0-9_-]{1,128})$/.test(
        suffix,
      )
    )
      return undefined;
    const parsed = siteDraftRecoverySchema.safeParse(value);
    return parsed.success ? parsed.data : undefined;
  }
  if (key.startsWith("layouts-filter:") && suffix === "layouts:catalogue") {
    const v = value as { category?: unknown; search?: unknown };
    return typeof v.search === "string" &&
      v.search.length <= 160 &&
      templateCategories.some((c) => c === v.category)
      ? { category: v.category, search: v.search }
      : undefined;
  }
  if (key === "settings-draft:settings:account") {
    const v = value as {
      draft?: unknown;
      baseline?: unknown;
      revision?: unknown;
    };
    const draft = preferencesSchema.safeParse(v.draft),
      baseline = preferencesSchema.safeParse(v.baseline);
    return draft.success &&
      baseline.success &&
      Number.isSafeInteger(v.revision) &&
      Number(v.revision) >= 0
      ? { draft: draft.data, baseline: baseline.data, revision: v.revision }
      : undefined;
  }
  if (key === "desktop-state:desktop:home") {
    const state = restoreDesktopState(value, ownerId);
    if (!state) return undefined;
    const panes = state.panes.map((p) => ({
      ...p,
      snapshots: validateSnapshots(
        p.snapshots,
        ownerId,
        getWorkspaceTabId(describeDesktopApp(p.href)!),
      ),
    }));
    return { ...state, panes };
  }
  return undefined;
}
export function validateSnapshots(
  input: unknown,
  ownerId: string,
  onlyTabId?: string,
): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  if (
    !isBoundedRecoveryJson(input, MAX_RECOVERY_BYTES) ||
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  )
    return output;
  for (const [key, value] of Object.entries(input).slice(0, 72)) {
    if (onlyTabId && key.slice(key.indexOf(":") + 1) !== onlyTabId) continue;
    // Nested Lattice shells cannot recursively embed another desktop snapshot.
    if (onlyTabId && key.startsWith("desktop-state:")) continue;
    const valid = validateSnapshot(key, value, ownerId);
    if (valid !== undefined) output[key] = valid;
  }
  return output;
}
export function readRecovery(
  raw: string | null,
  ownerId: string,
  now = Date.now(),
): RecoveryEnvelope | null {
  if (!raw || new TextEncoder().encode(raw).length > MAX_RECOVERY_BYTES)
    return null;
  try {
    const v = JSON.parse(raw);
    if (
      !isBoundedRecoveryJson(v, MAX_RECOVERY_BYTES) ||
      v.version !== 2 ||
      v.ownerId !== ownerId ||
      !Number.isSafeInteger(v.revision) ||
      v.revision < 0 ||
      typeof v.updatedAt !== "number" ||
      v.updatedAt > now + 60000 ||
      now - v.updatedAt > RECOVERY_TTL ||
      !Array.isArray(v.tabs) ||
      v.tabs.length > MAX_RECOVERY_TABS
    )
      return null;
    const tabs = recoverWorkspaceTabs(v.tabs)
      .filter((t) => resolveContinuityRoute(t.href))
      .slice(0, MAX_RECOVERY_TABS);
    const ids = new Set(tabs.map((t) => t.id));
    const snapshots = validateSnapshots(v.snapshots, ownerId);
    for (const key of Object.keys(snapshots))
      if (!ids.has(key.slice(key.indexOf(":") + 1))) delete snapshots[key];
    return {
      version: 2,
      ownerId,
      revision: v.revision,
      updatedAt: v.updatedAt,
      tabs,
      snapshots,
    };
  } catch {
    return null;
  }
}
/** Old global snapshots have no trustworthy owner. Only the embedded Lattice owner marker is attributable. */
export function migrateLegacyRecovery(
  rawTabs: string | null,
  rawSnapshots: string | null,
  ownerId: string,
  now = Date.now(),
): RecoveryEnvelope | null {
  if (
    !rawTabs ||
    !rawSnapshots ||
    rawSnapshots.length > MAX_RECOVERY_BYTES ||
    rawTabs.length > 32768
  )
    return null;
  try {
    const values = JSON.parse(rawSnapshots);
    if (!isBoundedRecoveryJson(values, MAX_RECOVERY_BYTES)) return null;
    const desktop = validateSnapshot(
      "desktop-state:desktop:home",
      values["desktop-state:desktop:home"],
      ownerId,
    );
    if (!desktop) return null;
    const tabs = recoverWorkspaceTabs(JSON.parse(rawTabs)).filter(
      (t) => t.id === "desktop:home",
    );
    if (!tabs.length) return null;
    return {
      version: 2,
      ownerId,
      revision: 0,
      updatedAt: now,
      tabs,
      snapshots: { "desktop-state:desktop:home": desktop },
    };
  } catch {
    return null;
  }
}
export function discardTabSnapshots(
  snapshots: Record<string, unknown>,
  tabId: string,
) {
  return Object.fromEntries(
    Object.entries(snapshots).filter(
      ([key]) => key.slice(key.indexOf(":") + 1) !== tabId,
    ),
  );
}
export function addContinuityTab(
  current: ContinuityTab[],
  next: ContinuityTab,
): ContinuityTab[] {
  if (current.some((t) => t.id === next.id))
    return current.map((t) =>
      t.id === next.id ? { ...next, dirty: t.dirty } : t,
    );
  if (current.length < 12) return [...current, next];
  const clean = current.findIndex((t) => !t.dirty);
  if (clean >= 0) return [...current.filter((_, i) => i !== clean), next];
  return current.length < MAX_RECOVERY_TABS ? [...current, next] : current;
}

/** Async work may finish only while its original context lease is current. */
export class ContextLease {
  version = 0;
  start() {
    return ++this.version;
  }
  matches(token: number) {
    return this.version === token;
  }
  cancel(token: number) {
    if (this.matches(token)) this.version++;
  }
}
