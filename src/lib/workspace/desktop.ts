import { describeWorkspaceRoute, getWorkspaceTabId } from "./tabs";

export const DESKTOP_TAB_ID = "desktop:home";
export const DESKTOP_SNAPSHOT_KEY = `desktop-state:${DESKTOP_TAB_ID}`;
export type PaneId = "first" | "second";
export type DesktopPaneState = { id: PaneId; href: string; open: boolean; dirty: boolean; snapshots: Record<string, unknown> };
export type DesktopState = { version: 1; userId: string; panes: DesktopPaneState[]; active: PaneId; order: PaneId[]; ratio: number; mode: "split" | "single" };

/** Only apps with native pane adapters are eligible. This is never an access grant. */
export function describeDesktopApp(href: unknown) {
  if (typeof href !== "string") return null;
  if (!href.startsWith("/") || href.startsWith("//") || href.includes("\\") || href.length > 1024) return null;
  try {
    const url = new URL(href, "https://workspace.invalid");
    if (url.origin !== "https://workspace.invalid" || url.hash) return null;
    if (!["/editor", "/templates"].includes(url.pathname)) return null;
    const keys = [...url.searchParams.keys()];
    if (url.pathname === "/templates" && keys.length) return null;
    if (keys.some(key => !["websiteId", "template"].includes(key) || url.searchParams.getAll(key).length !== 1)) return null;
    if ([...url.searchParams.values()].some(value => !/^[a-zA-Z0-9_-]{1,128}$/.test(value))) return null;
    return describeWorkspaceRoute(url.pathname, url.search);
  } catch { return null; }
}
export function sameDesktopContext(a: string, b: string) {
  const first = describeDesktopApp(a), second = describeDesktopApp(b);
  return Boolean(first && second && getWorkspaceTabId(first) === getWorkspaceTabId(second));
}
export function createDesktopState(userId: string, href = "/editor"): DesktopState {
  const first = describeDesktopApp(href) ? href : "/editor";
  return { version: 1, userId, panes: [
    { id: "first", href: first, open: true, dirty: false, snapshots: {} },
    { id: "second", href: first.startsWith("/templates") ? "/editor" : "/templates", open: true, dirty: false, snapshots: {} },
  ], active: "first", order: ["first", "second"], ratio: 50, mode: "split" };
}
export function restoreDesktopState(value: unknown, userId: string): DesktopState | null {
  if (!value || typeof value !== "object") return null;
  const saved = value as Partial<DesktopState>;
  if (saved.version !== 1 || saved.userId !== userId || !Array.isArray(saved.panes) || saved.panes.length !== 2) return null;
  if (saved.panes.some((pane, i) => !pane || pane.id !== (i === 0 ? "first" : "second") || !describeDesktopApp(pane.href) || typeof pane.open !== "boolean" || typeof pane.dirty !== "boolean" || !pane.snapshots || typeof pane.snapshots !== "object" || Array.isArray(pane.snapshots))) return null;
  if (!saved.panes.some(pane => pane.open) || sameDesktopContext(saved.panes[0].href, saved.panes[1].href)) return null;
  const base = createDesktopState(userId);
  return { ...base, panes: saved.panes, active: saved.active === "second" ? "second" : "first", order: saved.order?.[0] === "second" ? ["second", "first"] : ["first", "second"], ratio: typeof saved.ratio === "number" && Number.isFinite(saved.ratio) ? Math.min(60, Math.max(40, saved.ratio)) : 50, mode: saved.mode === "single" ? "single" : "split" };
}

/** Explicit app launches take priority over clean cached panes, never over unsaved work. */
export function applyDesktopRequest(state: DesktopState, href?: string): DesktopState {
  if (!href || !describeDesktopApp(href)) return state;
  const existing=state.panes.find(pane=>pane.open && sameDesktopContext(pane.href,href));
  if(existing)return {...state,active:existing.id};
  const target=state.panes.find(pane=>!pane.dirty);
  if(!target)return state;
  return {...state,active:target.id,panes:state.panes.map(pane=>pane.id===target.id?{...pane,href,open:true,snapshots:{},dirty:false}:pane)};
}

/** Visible Lattice choices come only from implemented native pane adapters. */
export const LATTICE_APPS = [
  { key: "website-engine", label: "Layout Studio", href: "/editor", icon: "website" },
  { key: "layouts", label: "Layouts", href: "/templates", icon: "layouts" },
] as const;
