"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { canCloseWorkspaceTab, describeWorkspaceRoute, getWorkspaceTabId, isSafeWorkspaceTabHref } from "@/lib/workspace/tabs";

type WorkspaceTab = {
  id: string;
  appKey: string;
  label: string;
  href: string;
  dirty: boolean;
};

type WorkspaceContextValue = {
  activeTabId: string | null;
  setActiveTabDirty: (dirty: boolean) => void;
  getSnapshot: <T,>(key: string) => T | undefined;
  setSnapshot: (key: string, value: unknown) => void;
  clearSnapshot: (key: string) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
const TAB_STORAGE_KEY = "lucia.workspace.tabs.v1";
const SNAPSHOT_STORAGE_KEY = "lucia.workspace.snapshots.v1";

function WorkspaceTabShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const websiteId = searchParams.get("websiteId");
  const contextualHref = (path: string) => websiteId ? `${path}?websiteId=${encodeURIComponent(websiteId)}` : path;
  const router = useRouter();
  const route = useMemo(() => describeWorkspaceRoute(pathname, search ? `?${search}` : ""), [pathname, search]);
  const showWorkspaceQuickNavigation = ["/pages", "/content", "/create", "/editor", "/templates", "/layouts"].includes(pathname);
  const [tabs, setTabs] = useState<WorkspaceTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<Record<string, unknown>>({});
  const snapshotsRef = useRef(snapshots);
  const [hydrated, setHydrated] = useState(false);
  const [mobileSwitcherOpen, setMobileSwitcherOpen] = useState(false);

  useEffect(() => {
    try {
      const savedTabs = JSON.parse(sessionStorage.getItem(TAB_STORAGE_KEY) || "[]") as WorkspaceTab[];
      const savedSnapshots = JSON.parse(sessionStorage.getItem(SNAPSHOT_STORAGE_KEY) || "{}") as Record<string, unknown>;
      if (Array.isArray(savedTabs)) setTabs(savedTabs.filter((tab) => tab && typeof tab.id === "string" && typeof tab.appKey === "string" && typeof tab.label === "string" && typeof tab.href === "string" && isSafeWorkspaceTabHref(tab.href) && typeof tab.dirty === "boolean"));
      if (savedSnapshots && typeof savedSnapshots === "object" && !Array.isArray(savedSnapshots)) setSnapshots(savedSnapshots);
    } catch {
      try {
        sessionStorage.removeItem(TAB_STORAGE_KEY);
        sessionStorage.removeItem(SNAPSHOT_STORAGE_KEY);
      } catch {
        // Storage can be unavailable in restricted browsing contexts.
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !route) return;
    const id = getWorkspaceTabId(route);
    setTabs((current) => {
      const existing = current.find((tab) => tab.id === id);
      const nextTab = { id, appKey: route.appKey, label: route.label, href: route.href, dirty: existing?.dirty ?? false };
      return existing
        ? current.map((tab) => tab.id === id ? nextTab : tab)
        : [...current, nextTab].slice(-12);
    });
    setActiveTabId(id);
    setMobileSwitcherOpen(false);
  }, [hydrated, route]);

  useEffect(() => {
    if (!hydrated) return;
    try { sessionStorage.setItem(TAB_STORAGE_KEY, JSON.stringify(tabs)); } catch { /* Keep tab navigation usable when storage is unavailable. */ }
  }, [hydrated, tabs]);

  useEffect(() => {
    snapshotsRef.current = snapshots;
    if (!hydrated) return;
    try {
      sessionStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshots));
    } catch {
      // If storage is full or disabled, keep the in-memory snapshot for this session.
    }
  }, [hydrated, snapshots]);

  useEffect(() => {
    if (!hydrated) return;
    const hasDirtyTabs = tabs.some((tab) => tab.dirty);
    if (!hasDirtyTabs) return;
    const protectUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", protectUnload);
    return () => window.removeEventListener("beforeunload", protectUnload);
  }, [hydrated, tabs]);

  const setActiveTabDirty = useCallback((dirty: boolean) => {
    setTabs((current) => current.map((tab) => tab.id === activeTabId ? { ...tab, dirty } : tab));
  }, [activeTabId]);

  const getSnapshot = useCallback(<T,>(key: string) => snapshotsRef.current[key] as T | undefined, []);
  const setSnapshot = useCallback((key: string, value: unknown) => {
    snapshotsRef.current = { ...snapshotsRef.current, [key]: value };
    try { sessionStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshotsRef.current)); } catch { /* Keep the in-memory recovery copy. */ }
    setSnapshots(snapshotsRef.current);
  }, []);
  const clearSnapshot = useCallback((key: string) => {
    const next = { ...snapshotsRef.current };
    delete next[key];
    snapshotsRef.current = next;
    try { sessionStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(next)); } catch { /* Keep the in-memory tab manager usable. */ }
    setSnapshots(next);
  }, []);

  const value = useMemo(() => ({ activeTabId, setActiveTabDirty, getSnapshot, setSnapshot, clearSnapshot }), [activeTabId, setActiveTabDirty, getSnapshot, setSnapshot, clearSnapshot]);

  function activateTab(tab: WorkspaceTab) {
    if (!isSafeWorkspaceTabHref(tab.href)) return;
    setActiveTabId(tab.id);
    setMobileSwitcherOpen(false);
    router.push(tab.href as Parameters<typeof router.push>[0]);
  }

  function closeTab(tab: WorkspaceTab) {
    const confirmed = !tab.dirty || window.confirm(`“${tab.label}” has unsaved changes. Close this workspace tab and discard those changes?`);
    if (!canCloseWorkspaceTab(tab.dirty, confirmed)) return;
    if (tab.dirty) clearSnapshot(`editor-draft:${tab.id}`);
    const remaining = tabs.filter((item) => item.id !== tab.id);
    setTabs(remaining);
    if (activeTabId === tab.id) {
      const next = remaining[remaining.length - 1];
      if (next) activateTab(next);
      else {
        setActiveTabId(null);
        router.push("/workspace");
      }
    }
  }

  return (
    <WorkspaceContext.Provider value={value}>
      {hydrated && route && (
        <div className="lucia-mobile-switcher"><button type="button" className="lucia-mobile-switcher-trigger" aria-expanded={mobileSwitcherOpen} aria-controls="lucia-mobile-app-list" onClick={() => setMobileSwitcherOpen((open) => !open)}>Apps <span aria-hidden="true">⌄</span></button><span className="lucia-mobile-current-app">{route.label}</span><Link href="/workspace" aria-label="Open workspace launcher">⌂</Link><div id="lucia-mobile-app-list" className="lucia-mobile-app-list" hidden={!mobileSwitcherOpen} aria-label="Open application workspaces">{tabs.map((tab) => <button type="button" key={tab.id} aria-current={tab.id === activeTabId ? "page" : undefined} onClick={() => activateTab(tab)}>{tab.label}{tab.dirty ? " •" : ""}</button>)}</div></div>
      )}
      {hydrated && route && (
        <nav className="workspace-tabbar lucia-blue-glass-nav" aria-label="Open app workspaces">
          <Link className="workspace-tab-home" href="/workspace" aria-label="Return to workspace launcher" title="Workspace launcher">⌂</Link>
          <div className="workspace-tablist" role="tablist" aria-label="Workspace tabs">
            {tabs.map((tab) => (
              <div className={`workspace-tab ${tab.id === activeTabId ? "is-active" : ""}`} key={tab.id}>
                <button type="button" role="tab" aria-selected={tab.id === activeTabId} onClick={() => activateTab(tab)} title={tab.dirty ? `${tab.label} — unsaved changes` : tab.label}>
                  <span>{tab.label}</span>{tab.dirty && <span className="workspace-tab-dirty" aria-label="Unsaved changes">•</span>}
                </button>
                <button type="button" className="workspace-tab-close" aria-label={`Close ${tab.label} tab`} onClick={() => closeTab(tab)}>×</button>
              </div>
            ))}
          </div>
        </nav>
      )}
      {hydrated && route && showWorkspaceQuickNavigation && (
        <nav className="workspace-route-navigation lucia-blue-glass-nav" aria-label="Workspace navigation">
          <Link href="/workspace" aria-label="Workspace overview">Overview</Link>
          <Link href="/workspace/websites" aria-current={pathname === "/workspace/websites" ? "page" : undefined}>Websites</Link>
          <Link href="/create" aria-current={pathname === "/create" ? "page" : undefined}>Create website</Link>
          <Link href="/templates" aria-current={pathname === "/templates" || pathname === "/layouts" ? "page" : undefined}>Layouts</Link>
          <Link href={contextualHref("/pages") as Parameters<typeof router.push>[0]} aria-current={pathname === "/pages" ? "page" : undefined}>Pages &amp; navigation</Link>
          <Link href={contextualHref("/content") as Parameters<typeof router.push>[0]} aria-current={pathname === "/content" ? "page" : undefined}>Blog &amp; media</Link>
          <Link href={contextualHref("/workspace/domains") as Parameters<typeof router.push>[0]} aria-current={pathname === "/workspace/domains" ? "page" : undefined}>Domains</Link>
          <Link href={contextualHref("/publish") as Parameters<typeof router.push>[0]} aria-current={pathname === "/publish" ? "page" : undefined}>Publishing</Link>
        </nav>
      )}
      {children}
    </WorkspaceContext.Provider>
  );
}

export function WorkspaceTabShell({ children }: { children: ReactNode }) {
  return <Suspense fallback={children}><WorkspaceTabShellInner>{children}</WorkspaceTabShellInner></Suspense>;
}

export function useWorkspaceTab() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    return {
      activeTabId: null,
      setActiveTabDirty: (_dirty: boolean) => {},
      getSnapshot: <T,>(_key: string) => undefined as T | undefined,
      setSnapshot: (_key: string, _value: unknown) => {},
      clearSnapshot: (_key: string) => {},
    };
  }
  return context;
}
