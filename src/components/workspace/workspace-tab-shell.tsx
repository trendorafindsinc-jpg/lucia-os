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
import { canCloseWorkspaceTab, describeWorkspaceRoute, getWorkspaceTabId } from "@/lib/workspace/tabs";

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
  const router = useRouter();
  const route = useMemo(() => describeWorkspaceRoute(pathname, search ? `?${search}` : ""), [pathname, search]);
  const [tabs, setTabs] = useState<WorkspaceTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<Record<string, unknown>>({});
  const snapshotsRef = useRef(snapshots);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const savedTabs = JSON.parse(sessionStorage.getItem(TAB_STORAGE_KEY) || "[]") as WorkspaceTab[];
      const savedSnapshots = JSON.parse(sessionStorage.getItem(SNAPSHOT_STORAGE_KEY) || "{}") as Record<string, unknown>;
      if (Array.isArray(savedTabs)) setTabs(savedTabs.filter((tab) => tab && typeof tab.id === "string" && typeof tab.appKey === "string" && typeof tab.label === "string" && typeof tab.href === "string" && typeof tab.dirty === "boolean"));
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
    setActiveTabId(tab.id);
    router.push(tab.href);
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
        <nav className="workspace-tabbar" aria-label="Open app workspaces">
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
