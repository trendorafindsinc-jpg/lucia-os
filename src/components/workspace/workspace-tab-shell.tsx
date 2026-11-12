"use client";
import React, {
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
import { describeDesktopApp } from "@/lib/workspace/desktop";
import {
  getWorkspaceTabId,
  isSafeWorkspaceTabHref,
} from "@/lib/workspace/tabs";
import {
  ContextLease,
  resolveContinuityRoute,
  addContinuityTab,
  canNavigateWorkspace,
  discardTabSnapshots,
  lifecycleFor,
  migrateLegacyRecovery,
  readRecovery,
  recoveryStorageKey,
  validateSnapshot,
  MAX_RECOVERY_BYTES,
  type ApplicationAdapter,
  type ContinuityTab,
  type RecoveryEnvelope,
  type TransitionState,
} from "@/lib/workspace/continuity";
import { AssistiveOrb } from "./assistive-orb";
import { installContinuityHistory } from "@/lib/workspace/navigation-history";
import "./workspace-continuity.css";
export type ProtectedAction = {
  label: string;
  dirty: boolean;
  save?: () => Promise<boolean>;
  discard: () => void;
  run: () => void | Promise<void>;
  preserve?: () => boolean;
};
export type WorkspaceContextValue = {
  accountId?: string | null;
  activeTabId: string | null;
  setActiveTabDirty: (dirty: boolean) => void;
  getSnapshot: <T>(key: string) => T | undefined;
  setSnapshot: (key: string, value: unknown) => void;
  clearSnapshot: (key: string) => void;
  registerAdapter?: (adapter: ApplicationAdapter) => () => void;
  protect?: (action: ProtectedAction) => Promise<boolean>;
  recoveryReady?: boolean;
};
export const WorkspaceContext = createContext<WorkspaceContextValue | null>(
  null,
);
// Legacy keys are read only for the attributable Lattice migration, never deleted.
const TAB_STORAGE_KEY = "lucia.workspace.tabs.v1";
const SNAPSHOT_STORAGE_KEY = "lucia.workspace.snapshots.v1";
function WorkspaceTabShellInner({
  children,
  userId,
  sessionReady = true,
}: {
  children: ReactNode;
  userId: string | null;
  sessionReady?: boolean;
}) {
  const pathname = usePathname(),
    searchParams = useSearchParams(),
    router = useRouter();
  const search = searchParams.toString();
  const route = useMemo(
    () => resolveContinuityRoute(pathname + (search ? `?${search}` : "")),
    [pathname, search],
  );
  const customerSurface = Boolean(route || pathname === "/workspace");
  const activeTabId = userId && route ? getWorkspaceTabId(route) : null;
  const currentHref = pathname + (search ? `?${search}` : "");
  const websiteId = searchParams.get("websiteId");
  const contextualHref = (path: string) =>
    websiteId ? `${path}?websiteId=${encodeURIComponent(websiteId)}` : path;
  const showWorkspaceQuickNavigation = [
    "/pages",
    "/content",
    "/create",
    "/editor",
    "/templates",
    "/layouts",
  ].includes(pathname);
  const [tabs, setTabsState] = useState<ContinuityTab[]>([]),
    [snapshots, setSnapshots] = useState<Record<string, unknown>>({});
  const tabsRef = useRef(tabs),
    snapshotsRef = useRef(snapshots);
  const revision = useRef(0);
  const hydratedRef = useRef(false);
  const blockedStorage = useRef(false);
  const adapters = useRef(new Map<string, ApplicationAdapter>());
  const rejectedSnapshots = useRef(new Set<string>());
  const [hydrated, setHydrated] = useState(false),
    [mobileSwitcherOpen, setMobileSwitcherOpen] = useState(false),
    [notice, setNotice] = useState("");
  const identityValid = sessionReady;
  const [transition, setTransition] = useState<TransitionState>("idle");
  const [pending, setPending] = useState<ProtectedAction | null>(null);
  const pendingRef = useRef<{
    action: ProtectedAction;
    resolve: (allowed: boolean) => void;
  } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLElement | null>(null);
  const latest = useRef({ currentHref, activeTabId });
  latest.current = { currentHref, activeTabId };
  const setTabs = useCallback((fn: (v: ContinuityTab[]) => ContinuityTab[]) => {
    const next = fn(tabsRef.current);
    tabsRef.current = next;
    setTabsState(next);
  }, []);
  const persist = useCallback(() => {
    if (!userId || !hydratedRef.current || blockedStorage.current) return;
    const envelope: RecoveryEnvelope = {
      version: 2,
      ownerId: userId,
      revision: revision.current + 1,
      updatedAt: Date.now(),
      tabs: tabsRef.current,
      snapshots: snapshotsRef.current,
    };
    const raw = JSON.stringify(envelope);
    if (new TextEncoder().encode(raw).length > MAX_RECOVERY_BYTES) {
      setNotice(
        "Recovery storage is full. Your current work remains in memory; save it before closing this browser.",
      );
      return;
    }
    try {
      const key = recoveryStorageKey(userId);
      const stored = readRecovery(sessionStorage.getItem(key), userId);
      if (stored && stored.revision > revision.current) {
        setNotice(
          "Recovery changed in another writer. Current work stays in memory; reload only after saving it.",
        );
        return;
      }
      sessionStorage.setItem(key, raw);
      revision.current = envelope.revision;
    } catch {
      setNotice(
        "Browser recovery storage is unavailable. Current work stays in memory; save it before closing this browser.",
      );
    }
  }, [userId]);
  useEffect(() => {
    if (!customerSurface || hydratedRef.current) return;
    if (!userId) {
      hydratedRef.current = true;
      setHydrated(true);
      return;
    }
    try {
      const original = sessionStorage.getItem(recoveryStorageKey(userId));
      const parsed = readRecovery(original, userId);
      if (original && !parsed) {
        blockedStorage.current = true;
        setNotice(
          "Stored recovery is invalid or expired and has been left untouched. Current work can continue in memory; save it before closing this browser.",
        );
      }
      const saved =
        parsed ??
        migrateLegacyRecovery(
          sessionStorage.getItem(TAB_STORAGE_KEY),
          sessionStorage.getItem(SNAPSHOT_STORAGE_KEY),
          userId,
        );
      if (saved) {
        revision.current = saved.revision;
        tabsRef.current = saved.tabs;
        snapshotsRef.current = saved.snapshots;
        setTabsState(saved.tabs);
        setSnapshots(saved.snapshots);
      }
    } catch {
      setNotice(
        "Browser recovery is unavailable. Your workspace can still open.",
      );
    }
    hydratedRef.current = true;
    setHydrated(true);
  }, [userId, customerSurface]);
  useEffect(() => {
    setTransition("idle");
    setNotice((current) =>
      current.startsWith("The destination has not finished opening.")
        ? ""
        : current,
    );
  }, [currentHref]);
  useEffect(() => {
    if (!hydrated || !route || !userId) return;
    const id = getWorkspaceTabId(route);
    setTabs((current) =>
      addContinuityTab(current, {
        ...route,
        id,
        dirty: current.find((t) => t.id === id)?.dirty ?? false,
      }),
    );
    setMobileSwitcherOpen(false);
    setTransition("idle");
  }, [hydrated, route, userId, setTabs]);
  useEffect(() => {
    if (hydrated) persist();
  }, [hydrated, tabs, snapshots, persist]);
  useEffect(() => {
    window.addEventListener("pagehide", persist);
    return () => window.removeEventListener("pagehide", persist);
  }, [persist]);
  const getSnapshot = useCallback(
    <T,>(key: string) => snapshotsRef.current[key] as T | undefined,
    [],
  );
  const setSnapshot = useCallback(
    (key: string, value: unknown) => {
      if (!userId) return;
      const checked = validateSnapshot(key, value, userId);
      if (checked === undefined) {
        rejectedSnapshots.current.add(key.slice(key.indexOf(":") + 1));
        setNotice(
          "This draft cannot be stored for recovery yet. Keep this app open or save it before leaving.",
        );
        return;
      }
      rejectedSnapshots.current.delete(key.slice(key.indexOf(":") + 1));
      snapshotsRef.current = { ...snapshotsRef.current, [key]: checked };
      setSnapshots(snapshotsRef.current);
      persist();
    },
    [userId, persist],
  );
  const clearSnapshot = useCallback(
    (key: string) => {
      const next = { ...snapshotsRef.current };
      delete next[key];
      snapshotsRef.current = next;
      setSnapshots(next);
      persist();
    },
    [persist],
  );
  const setActiveTabDirty = useCallback(
    (dirty: boolean) => {
      if (activeTabId)
        setTabs((current) =>
          current.map((tab) =>
            tab.id === activeTabId ? { ...tab, dirty } : tab,
          ),
        );
    },
    [activeTabId, setTabs],
  );
  const registerAdapter = useCallback(
    (adapter: ApplicationAdapter) => {
      if (!activeTabId) return () => {};
      adapters.current.set(activeTabId, adapter);
      return () => {
        if (adapters.current.get(activeTabId) === adapter)
          adapters.current.delete(activeTabId);
      };
    },
    [activeTabId],
  );
  const hasSnapshot = useCallback(
    (id: string) =>
      !rejectedSnapshots.current.has(id) &&
      Object.keys(snapshotsRef.current).some(
        (key) => key.slice(key.indexOf(":") + 1) === id,
      ),
    [],
  );
  const protect = useCallback(
    async (action: ProtectedAction): Promise<boolean> => {
      if (pendingRef.current) return false;
      if (!action.dirty || action.preserve?.()) {
        persist();
        try {
          await action.run();
          return true;
        } catch {
          setTransition("failed");
          setNotice(
            "The action could not finish. Your work is still available.",
          );
          return false;
        }
      }
      trigger.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setTransition("confirming");
      setPending(action);
      return new Promise((resolve) => {
        pendingRef.current = { action, resolve };
      });
    },
    [persist],
  );
  function resolvePending(allowed: boolean) {
    const request = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    setTransition("idle");
    request?.resolve(allowed);
    if (trigger.current?.isConnected) trigger.current.focus();
    else
      document
        .querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
        ?.focus();
  }
  async function decide(choice: "cancel" | "discard" | "save") {
    const request = pendingRef.current;
    if (!request) return;
    if (choice === "cancel") {
      resolvePending(false);
      return;
    }
    if (choice === "save") {
      setTransition("saving");
      try {
        if (!request.action.save || !(await request.action.save())) {
          setTransition("failed");
          setNotice(
            "Saving did not finish. Your changes remain open; retry or cancel.",
          );
          return;
        }
      } catch {
        setTransition("failed");
        setNotice("Saving failed. Your changes remain open.");
        return;
      }
    } else request.action.discard();
    try {
      persist();
      await request.action.run();
      resolvePending(true);
    } catch {
      setTransition("failed");
      setNotice("The action could not finish. Your draft is still available.");
    }
  }
  useEffect(() => {
    if (pending && !dialog.current?.open) dialog.current?.showModal();
    if (!pending && dialog.current?.open) dialog.current.close();
  }, [pending]);
  const navigate = useCallback(
    (href: string) => {
      const destination = resolveContinuityRoute(href);
      if (
        destination &&
        tabsRef.current.length >= 24 &&
        !tabsRef.current.some((t) => t.id === getWorkspaceTabId(destination)) &&
        tabsRef.current.every((t) => t.dirty)
      ) {
        setNotice(
          "All 24 workspace slots contain unsaved work. Save or close an app before opening another context.",
        );
        return;
      }
      if (!canNavigateWorkspace(href)) {
        setNotice("That destination is unavailable in this workspace.");
        return;
      }
      const id = latest.current.activeTabId,
        tab = tabsRef.current.find((t) => t.id === id),
        adapter = id ? adapters.current.get(id) : undefined;
      void protect({
        label: tab?.label ?? "this app",
        dirty: tab?.dirty ?? false,
        save: adapter?.save,
        discard: () => {
          adapter?.discard();
          if (id) {
            snapshotsRef.current = discardTabSnapshots(
              snapshotsRef.current,
              id,
            );
            setSnapshots(snapshotsRef.current);
            setTabs((v) =>
              v.map((t) => (t.id === id ? { ...t, dirty: false } : t)),
            );
          }
        },
        preserve: () =>
          adapter ? adapter.canSuspend() : Boolean(id && hasSnapshot(id)),
        run: () => {
          setTransition("navigating");
          router.push(href as Parameters<typeof router.push>[0]);
        },
      });
    },
    [protect, router, setTabs, hasSnapshot],
  );
  useEffect(() => {
    if (!customerSurface) return;
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !userId
      )
        return;
      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (
        !target ||
        target.closest("[data-lucia-pane]") ||
        target.target === "_blank" ||
        target.hasAttribute("download")
      )
        return;
      const url = new URL(target.href);
      if (
        url.origin !== location.origin ||
        url.hash ||
        !canNavigateWorkspace(url.pathname + url.search)
      )
        return;
      if (url.pathname + url.search === latest.current.currentHref) return;
      event.preventDefault();
      navigate(url.pathname + url.search);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [navigate, userId, customerSurface]);
  useEffect(() => {
    if (!userId || !customerSurface) return;
    return installContinuityHistory({
      shouldBlock: (outgoingHref) => {
        const outgoing = resolveContinuityRoute(outgoingHref);
        const id = outgoing ? getWorkspaceTabId(outgoing) : null;
        // Next may commit the destination before dispatch reaches this listener.
        // Check the latest validated checkpoint, rather than the destination's newly mounted adapter.
        return Boolean(
          tabsRef.current.find((t) => t.id === id)?.dirty &&
          !(id && hasSnapshot(id)),
        );
      },
      confirm: (run, outgoingHref) => {
        const outgoing = resolveContinuityRoute(outgoingHref);
        const id = outgoing ? getWorkspaceTabId(outgoing) : null,
          adapter = id ? adapters.current.get(id) : undefined;
        void protect({
          label: "this app",
          dirty: true,
          save: adapter?.save,
          discard: () => {
            adapter?.discard();
            if (id) {
              snapshotsRef.current = discardTabSnapshots(
                snapshotsRef.current,
                id,
              );
              setSnapshots(snapshotsRef.current);
              setTabs((t) =>
                t.map((v) => (v.id === id ? { ...v, dirty: false } : v)),
              );
            }
          },
          run,
        });
      },
    });
  }, [protect, setTabs, userId, customerSurface, hasSnapshot]);
  useEffect(() => {
    if (!customerSurface || !hydrated || !tabs.some((tab) => tab.dirty)) return;
    const protectUnload = (event: BeforeUnloadEvent) => {
      persist();
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", protectUnload);
    return () => window.removeEventListener("beforeunload", protectUnload);
  }, [hydrated, tabs, persist, customerSurface]);
  useEffect(() => {
    if (transition !== "navigating") return;
    const timeout = setTimeout(() => {
      setTransition("failed");
      setNotice(
        "The destination has not finished opening. Your work remains available; try its link again.",
      );
    }, 20000);
    return () => clearTimeout(timeout);
  }, [transition]);
  const limitReached = Boolean(
    hydrated &&
    route &&
    tabs.length >= 24 &&
    !tabs.some((t) => t.id === activeTabId),
  );
  const value = useMemo<WorkspaceContextValue>(
    () => ({
      accountId: userId,
      activeTabId:
        hydrated && identityValid && !limitReached ? activeTabId : null,
      setActiveTabDirty,
      getSnapshot,
      setSnapshot,
      clearSnapshot,
      registerAdapter,
      protect,
      recoveryReady: hydrated && identityValid,
    }),
    [
      userId,
      activeTabId,
      hydrated,
      identityValid,
      limitReached,
      setActiveTabDirty,
      getSnapshot,
      setSnapshot,
      clearSnapshot,
      registerAdapter,
      protect,
    ],
  );
  function activateTab(tab: ContinuityTab) {
    if (!isSafeWorkspaceTabHref(tab.href)) return;
    setMobileSwitcherOpen(false);
    navigate(tab.href);
  }
  function closeTab(tab: ContinuityTab) {
    const adapter = adapters.current.get(tab.id);
    void protect({
      label: tab.label,
      dirty: tab.dirty,
      save: adapter?.save,
      discard: () => {
        adapter?.discard();
      },
      run: () => {
        snapshotsRef.current = discardTabSnapshots(
          snapshotsRef.current,
          tab.id,
        );
        setSnapshots(snapshotsRef.current);
        setTabs((v) => v.filter((t) => t.id !== tab.id));
        if (activeTabId === tab.id || limitReached) {
          const remaining = tabsRef.current;
          router.push(
            (remaining.at(-1)?.href ?? "/workspace") as Parameters<
              typeof router.push
            >[0],
          );
        }
      },
    });
  }
  return (
    <WorkspaceContext.Provider value={value}>
      {transition === "navigating" && customerSurface && (
        <p role="status" className="continuity-notice">
          Opening requested workspace…
        </p>
      )}
      {notice && userId && customerSurface && (
        <p className="continuity-notice" role="status">
          {notice}
        </p>
      )}
      {!identityValid && customerSurface && (
        <p role="alert" className="continuity-notice">
          Verifying your session before showing recovered work…{" "}
          <button onClick={() => window.location.reload()}>
            Reload securely
          </button>
        </p>
      )}
      {hydrated && route && identityValid && (
        <div className="lucia-mobile-switcher">
          <button
            type="button"
            className="lucia-mobile-switcher-trigger"
            aria-expanded={mobileSwitcherOpen}
            aria-controls="lucia-mobile-app-list"
            onClick={() => setMobileSwitcherOpen((open) => !open)}
          >
            Apps <span aria-hidden="true">⌄</span>
          </button>
          <span className="lucia-mobile-current-app">{route.label}</span>
          <Link href="/workspace" aria-label="Open workspace launcher">
            ⌂
          </Link>
          <div
            id="lucia-mobile-app-list"
            className="lucia-mobile-app-list"
            hidden={!mobileSwitcherOpen}
            aria-label="Open application workspaces"
          >
            {tabs.map((tab) => (
              <button
                type="button"
                key={tab.id}
                aria-current={tab.id === activeTabId ? "page" : undefined}
                onClick={() => activateTab(tab)}
              >
                {tab.label}
                {tab.dirty ? " •" : ""}
              </button>
            ))}
          </div>
        </div>
      )}
      {hydrated && route && identityValid && (
        <nav
          className="workspace-tabbar lucia-blue-glass-nav"
          aria-label="Open app workspaces"
        >
          <Link
            className="workspace-tab-home"
            href="/workspace"
            aria-label="Return to workspace launcher"
            title="Workspace launcher"
          >
            ⌂
          </Link>
          <div
            className="workspace-tablist"
            role="tablist"
            aria-label="Workspace tabs"
            onKeyDown={(event) => {
              if (
                !(event.target instanceof HTMLElement) ||
                event.target.getAttribute("role") !== "tab"
              )
                return;
              if (
                !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              )
                return;
              event.preventDefault();
              const current = tabs.findIndex((tab) => tab.id === activeTabId);
              const index =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? tabs.length - 1
                    : (current +
                        (event.key === "ArrowRight" ? 1 : -1) +
                        tabs.length) %
                      tabs.length;
              if (!tabs[index]) return;
              activateTab(tabs[index]);
              const buttons =
                event.currentTarget.querySelectorAll<HTMLButtonElement>(
                  '[role="tab"]',
                );
              buttons[index]?.focus();
            }}
          >
            {tabs.map((tab) => (
              <div
                data-lifecycle={lifecycleFor(
                  tab,
                  activeTabId,
                  hasSnapshot(tab.id),
                )}
                className={`workspace-tab ${tab.id === activeTabId ? "is-active" : ""}`}
                key={tab.id}
              >
                <button
                  type="button"
                  role="tab"
                  aria-controls="lucia-active-workspace"
                  tabIndex={tab.id === activeTabId ? 0 : -1}
                  aria-selected={tab.id === activeTabId}
                  onClick={() => activateTab(tab)}
                  title={
                    tab.dirty ? `${tab.label} — unsaved changes` : tab.label
                  }
                >
                  <span>{tab.label}</span>
                  {tab.dirty && (
                    <span
                      className="workspace-tab-dirty"
                      aria-label="Unsaved changes"
                    >
                      •
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  className="workspace-tab-close"
                  aria-label={`Close ${tab.label} tab`}
                  onClick={() => closeTab(tab)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="desktop-workspace-launch">
            <Link
              href={{
                pathname: "/workspace/desktop",
                query:
                  route && describeDesktopApp(route.href)
                    ? { app: route.href }
                    : {},
              }}
            >
              Lattice
            </Link>
          </div>
        </nav>
      )}
      {hydrated && route && showWorkspaceQuickNavigation && (
        <nav
          className="workspace-route-navigation lucia-blue-glass-nav"
          aria-label="Workspace navigation"
        >
          <Link href="/workspace" aria-label="Workspace overview">
            Overview
          </Link>
          <Link
            href="/workspace/websites"
            aria-current={
              pathname === "/workspace/websites" ? "page" : undefined
            }
          >
            Websites
          </Link>
          <Link
            href="/create"
            aria-current={pathname === "/create" ? "page" : undefined}
          >
            Create website
          </Link>
          <Link
            href="/templates"
            aria-current={
              pathname === "/templates" || pathname === "/layouts"
                ? "page"
                : undefined
            }
          >
            Layouts
          </Link>
          <Link
            href={contextualHref("/pages") as Parameters<typeof router.push>[0]}
            aria-current={pathname === "/pages" ? "page" : undefined}
          >
            Pages &amp; navigation
          </Link>
          <Link
            href={
              contextualHref("/content") as Parameters<typeof router.push>[0]
            }
            aria-current={pathname === "/content" ? "page" : undefined}
          >
            Blog &amp; media
          </Link>
          <Link
            href={
              contextualHref("/workspace/domains") as Parameters<
                typeof router.push
              >[0]
            }
            aria-current={
              pathname === "/workspace/domains" ? "page" : undefined
            }
          >
            Domains
          </Link>
          <Link
            href={
              contextualHref("/publish") as Parameters<typeof router.push>[0]
            }
            aria-current={pathname === "/publish" ? "page" : undefined}
          >
            Publishing
          </Link>
        </nav>
      )}
      <div
        key={route ? getWorkspaceTabId(route) : pathname}
        hidden={customerSurface && !identityValid}
      >
        {limitReached ? (
          <section className="continuity-notice" role="alert">
            <h1>Save or close an app to continue.</h1>
            <p>
              All workspace slots contain unsaved work. Your existing drafts
              have been retained.
            </p>
          </section>
        ) : route ? (
          <div
            id="lucia-active-workspace"
            role="tabpanel"
            aria-label={route.label}
          >
            {children}
          </div>
        ) : (
          children
        )}
      </div>
      {hydrated && route && identityValid && <AssistiveOrb />}

      <dialog
        ref={dialog}
        className="continuity-dialog"
        aria-labelledby="continuity-dialog-title"
        onCancel={(event) => {
          event.preventDefault();
          if (transition !== "saving") resolvePending(false);
        }}
      >
        <h2 id="continuity-dialog-title">Keep your changes?</h2>
        <p>
          {pending?.label} has unsaved changes. Session recovery is not a
          permanent save.
        </p>
        {transition === "failed" && (
          <p role="alert">
            Saving or navigation did not finish. Your changes remain available.
          </p>
        )}
        <div>
          <button
            autoFocus
            disabled={!identityValid || transition === "saving"}
            onClick={() => void decide("cancel")}
          >
            Cancel
          </button>
          <button
            disabled={!identityValid || transition === "saving"}
            onClick={() => void decide("discard")}
          >
            Discard changes
          </button>
          {pending?.save && (
            <button
              disabled={!identityValid || transition === "saving"}
              onClick={() => void decide("save")}
            >
              {transition === "saving" ? "Saving…" : "Save and continue"}
            </button>
          )}
        </div>
      </dialog>
    </WorkspaceContext.Provider>
  );
}
/** Existing /api/auth/me is the authoritative session source; public hosts never initialize recovery. */
function WorkspaceSessionBoundary({
  children,
  platformHosts,
}: {
  children: ReactNode;
  platformHosts: readonly string[];
}) {
  const [platform, setPlatform] = useState(false);
  useEffect(() => {
    setPlatform(platformHosts.includes(window.location.hostname.toLowerCase()));
  }, [platformHosts]);
  const pathname = usePathname(),
    search = useSearchParams().toString();
  const href = pathname + (search ? `?${search}` : "");
  const customer =
    platform &&
    Boolean(pathname === "/workspace" || resolveContinuityRoute(href));
  const [session, setSession] = useState<{
    id: string | null;
    href: string;
  } | null>(null);
  const [checking, setChecking] = useState(false),
    [failed, setFailed] = useState(false);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const epoch = useRef(new ContextLease());
  useEffect(() => {
    if (!customer) return;
    const lease = epoch.current;
    const check = async () => {
      const token = lease.start();
      setChecking(true);
      setFailed(false);
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok && response.status !== 401)
          throw Error("Session check failed");
        const body = await response.json();
        if (!lease.matches(token)) return;
        const id =
          response.ok && typeof body.user?.id === "string"
            ? body.user.id
            : null;
        if (sessionRef.current?.id && sessionRef.current.id !== id) {
          window.location.reload();
          return;
        }
        setSession({ id, href });
        setChecking(false);
      } catch {
        if (lease.matches(token)) {
          setChecking(false);
          setFailed(true);
        }
      }
    };
    void check();
    window.addEventListener("focus", check);
    return () => {
      lease.cancel(lease.version);
      window.removeEventListener("focus", check);
    };
  }, [href, customer]);
  const ready =
    !customer ||
    Boolean(session && session.href === href && !checking && !failed);
  if (!customer && !session) return <>{children}</>;
  if (customer && !session)
    return (
      <>
        <p className="continuity-notice" role={failed ? "alert" : "status"}>
          {failed
            ? "Session verification failed. Reload when connected."
            : "Checking your workspace session…"}
        </p>
        {failed && (
          <button onClick={() => window.location.reload()}>
            Reload securely
          </button>
        )}
      </>
    );
  return (
    <WorkspaceTabShellInner
      key={session?.id ?? "anonymous"}
      userId={session?.id ?? null}
      sessionReady={ready}
    >
      {children}
    </WorkspaceTabShellInner>
  );
}
export function WorkspaceTabShell({
  children,
  platformHosts = [],
}: {
  children: ReactNode;
  platformHosts?: readonly string[];
}) {
  return (
    <Suspense fallback={children}>
      <WorkspaceSessionBoundary platformHosts={platformHosts}>
        {children}
      </WorkspaceSessionBoundary>
    </Suspense>
  );
}
const fallback: WorkspaceContextValue = {
  activeTabId: null,
  setActiveTabDirty: () => {},
  getSnapshot: <T,>() => undefined as T | undefined,
  setSnapshot: () => {},
  clearSnapshot: () => {},
  recoveryReady: false,
};
export function useWorkspaceTab() {
  return useContext(WorkspaceContext) ?? fallback;
}

/** Register real callbacks without re-registering on every keystroke. */
export function useWorkspaceAdapter(adapter: ApplicationAdapter) {
  const { registerAdapter } = useWorkspaceTab();
  const latest = useRef(adapter);
  latest.current = adapter;
  const canSave = Boolean(adapter.save);
  useEffect(
    () =>
      registerAdapter?.({
        save: canSave ? () => latest.current.save!() : undefined,
        canSuspend: () => latest.current.canSuspend(),
        discard: () => latest.current.discard(),
      }),
    [registerAdapter, canSave],
  );
}
