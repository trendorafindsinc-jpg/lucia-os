"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { VisualSiteEditor } from "@/components/editor/visual-site-editor";
import { TemplateGallery } from "@/components/templates/template-gallery";
import { WorkspaceContext, useWorkspaceTab, type WorkspaceContextValue } from "./workspace-tab-shell";
import { AppNavigationProvider } from "./app-navigation";
import { WorkspaceIcon } from "./workspace-icon";
import { applyDesktopRequest, createDesktopState, DESKTOP_SNAPSHOT_KEY, DESKTOP_TAB_ID, describeDesktopApp, restoreDesktopState, sameDesktopContext, type DesktopState, type PaneId } from "@/lib/workspace/desktop";
import { getWorkspaceTabId, isSafeWorkspaceTabHref } from "@/lib/workspace/tabs";
import styles from "./desktop-workspace.module.css";

/** Late completions from a closed/replaced app cannot mutate the next app in that slot. */
function PaneSessionProvider({ adapter, tabId, children }: { adapter: Omit<WorkspaceContextValue, "activeTabId">; tabId: string; children: React.ReactNode }) {
  const mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const value=useMemo<WorkspaceContextValue>(()=>({
    activeTabId:tabId,
    getSnapshot:<T,>(key:string)=>adapter.getSnapshot<T>(key),
    setSnapshot:(key,value)=>{if(mounted.current)adapter.setSnapshot(key,value);},
    clearSnapshot:key=>{if(mounted.current)adapter.clearSnapshot(key);},
    setActiveTabDirty:dirty=>{if(mounted.current)adapter.setActiveTabDirty(dirty);},
  }),[adapter,tabId]);
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function DesktopWorkspace({ userId, initialHref }: { userId: string; initialHref?: string }) {
  const { activeTabId: parentTabId, getSnapshot: getParentSnapshot, setSnapshot: setParentSnapshot, setActiveTabDirty: setParentDirty } = useWorkspaceTab();
  const router = useRouter();
  const [state, setState] = useState(() => createDesktopState(userId, initialHref));
  const stateRef = useRef(state);
  const [restored, setRestored] = useState(false);
  const [canSplit, setCanSplit] = useState(false);
  const [notice, setNotice] = useState("");
  const paneRefs = useRef<Partial<Record<PaneId, HTMLElement | null>>>({});
  const scrollRefs = useRef<Partial<Record<PaneId, HTMLDivElement | null>>>({});
  const update = useCallback((transform: (current: DesktopState) => DesktopState) => {
    const next = transform(stateRef.current);
    stateRef.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    if (restored || parentTabId !== DESKTOP_TAB_ID) return;
    const saved = restoreDesktopState(getParentSnapshot(DESKTOP_SNAPSHOT_KEY), userId);
    if (saved) {
      const next=applyDesktopRequest(saved,initialHref);
      update(() => next);
      if(initialHref && !next.panes.some(pane=>pane.open && sameDesktopContext(pane.href,initialHref)))setNotice("Your previous Lattice workspace has unsaved changes in both panes. Save or close a pane before opening the requested app.");
    }
    setRestored(true);
  }, [restored, parentTabId, getParentSnapshot, userId, initialHref, update]);
  useEffect(() => {
    const media = window.matchMedia("(min-width:1280px) and (hover:hover) and (pointer:fine)");
    const sync = () => setCanSplit(media.matches);
    sync();media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  const dirty = state.panes.some(pane => pane.open && pane.dirty);
  useEffect(() => {
    if (!restored || parentTabId !== DESKTOP_TAB_ID) return;
    setParentSnapshot(DESKTOP_SNAPSHOT_KEY, state);
    setParentDirty(dirty);
  }, [state, dirty, restored, parentTabId, setParentSnapshot, setParentDirty]);

  const adapters = useMemo(() => Object.fromEntries((["first", "second"] as const).map(id => [id, {
    getSnapshot: <T,>(key: string) => stateRef.current.panes.find(pane => pane.id === id)?.snapshots[key] as T | undefined,
    setSnapshot: (key: string, value: unknown) => update(current => ({ ...current, panes: current.panes.map(pane => pane.id === id ? { ...pane, snapshots: { ...pane.snapshots, [key]: value } } : pane) })),
    clearSnapshot: (key: string) => update(current => ({ ...current, panes: current.panes.map(pane => {
      if (pane.id !== id) return pane;
      const snapshots = { ...pane.snapshots };delete snapshots[key];return { ...pane, snapshots };
    }) })),
    setActiveTabDirty: (value: boolean) => {
      if (stateRef.current.panes.find(pane => pane.id === id)?.dirty === value) return;
      update(current => ({ ...current, panes: current.panes.map(pane => pane.id === id ? { ...pane, dirty: value } : pane) }));
    },
  }])) as Record<PaneId, Omit<WorkspaceContextValue, "activeTabId">>, [update]);

  function activate(id: PaneId) {
    update(current => ({ ...current, active: id }));
    requestAnimationFrame(() => scrollRefs.current[id]?.focus({ preventScroll: true }));
  }
  function navigate(id: PaneId, href: string) {
    const current = stateRef.current;
    const pane = current.panes.find(item => item.id === id)!;
    if (href === pane.href) return;
    if (!describeDesktopApp(href)) {
      if (href !== "/" && href !== "/workspace" && !isSafeWorkspaceTabHref(href)) {
        setNotice("That destination cannot be opened from this workspace.");return;
      }
      // Unsupported apps use their normal server-checked routes, never arbitrary embedding.
      router.push(href as Parameters<typeof router.push>[0]);return;
    }
    if (current.panes.some(other => other.id !== id && other.open && sameDesktopContext(other.href, href))) {
      setNotice("That app context is already open in the other pane. Focus that pane to continue.");return;
    }
    if (pane.dirty && !window.confirm("This app has unsaved changes. Discard those changes before changing this pane?")) return;
    update(value => ({ ...value, active: id, panes: value.panes.map(item => item.id === id ? { ...item, href, dirty: false, snapshots: {} } : item) }));
    setNotice("");
  }
  function closePane(id: PaneId) {
    const current = stateRef.current;
    const pane = current.panes.find(item => item.id === id)!;
    if (pane.dirty && !window.confirm("Close this app pane and discard its unsaved changes?")) return;
    const remaining = current.panes.find(item => item.id !== id && item.open);
    if (!remaining) { setNotice("Keep one app open, or return to Home. Use the Lattice tab’s close button to close the whole workspace.");return; }
    update(value => ({ ...value, active: remaining.id, panes: value.panes.map(item => item.id === id ? { ...item, open: false, dirty: false, snapshots: {} } : item) }));
    activate(remaining.id);
  }
  function reopen(id: PaneId) {
    const pane=stateRef.current.panes.find(item=>item.id===id)!;
    if(stateRef.current.panes.some(other=>other.id!==id && other.open && sameDesktopContext(other.href,pane.href))){setNotice("That app context is already open in the other pane.");return;}
    update(current => ({ ...current, active: id, panes: current.panes.map(pane => pane.id === id ? { ...pane, open: true } : pane) }));
    setNotice("");
  }
  const activeId = state.panes.find(pane => pane.id === state.active && pane.open)?.id || state.panes.find(pane => pane.open)!.id;
  const split = canSplit && state.mode === "split" && state.panes.every(pane => pane.open);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input,textarea,select,[contenteditable],button,a,[role=slider],[role=combobox]") && !(event.altKey && event.shiftKey && ["ArrowLeft","ArrowRight"].includes(event.key))) return;
      if (!event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && ["ArrowUp","ArrowDown","PageUp","PageDown","Home","End"," "].includes(event.key)) {
        const id = stateRef.current.active;
        const body = scrollRefs.current[id];
        if (!body || !document.activeElement || !(body.contains(document.activeElement) || paneRefs.current[id]?.contains(document.activeElement))) return;
        const amount = event.key === "ArrowDown" ? 56 : event.key === "ArrowUp" ? -56 : event.key === "PageDown" || event.key === " " ? body.clientHeight * 0.85 : event.key === "PageUp" ? -body.clientHeight * 0.85 : null;
        if (body.scrollHeight <= body.clientHeight) return;
        event.preventDefault();
        if (amount === null) body.scrollTo({ top: event.key === "Home" ? 0 : body.scrollHeight, behavior: "smooth" });
        else body.scrollBy({ top: amount, behavior: "smooth" });
        return;
      }
      if (!event.altKey || !event.shiftKey || !["ArrowLeft", "ArrowRight"].includes(event.key) || event.target instanceof HTMLElement && event.target.closest("input,textarea,select,[contenteditable=true]")) return;
      const id = stateRef.current.order[event.key === "ArrowLeft" ? 0 : 1];
      if (!stateRef.current.panes.find(pane => pane.id === id)?.open) return;
      event.preventDefault();update(current => ({ ...current, active: id }));
      requestAnimationFrame(() => paneRefs.current[id]?.focus());
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [update]);

  return <main className={styles.desktop} aria-label="Lattice workspace">
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>LUCIA OS · LATTICE</p><h1>Lattice</h1><p>Two apps. One workspace.</p></div>
      <Link className={styles.home} href="/workspace"><WorkspaceIcon icon="home" />Home</Link>
    </header>
    <div className={styles.toolbar} aria-label="Lattice view controls">
      <div className={styles.appTabs} aria-label="Open Lattice apps">
        {state.order.map(id => { const pane = state.panes.find(item => item.id === id)!;const app = describeDesktopApp(pane.href)!;
          return pane.open ? <button type="button" key={id} aria-pressed={activeId === id} aria-controls={`desktop-pane-${id}`} onClick={() => activate(id)}><WorkspaceIcon icon={app.appKey === "layouts" ? "layouts" : "website"} />{app.appKey === "layouts" ? "Layouts" : "Layout Studio"}{pane.dirty && <span aria-label="Unsaved changes">•</span>}</button> : <button type="button" key={id} onClick={() => reopen(id)}>Reopen {app.appKey === "layouts" ? "Layouts" : "Layout Studio"}</button>;
        })}
      </div>
      <div className={styles.viewActions}>
        <button type="button" aria-pressed={state.mode === "single"} onClick={() => update(current => ({ ...current, mode: "single" }))}>Single app</button>
        <button type="button" disabled={!canSplit || state.panes.some(pane => !pane.open)} title={canSplit ? "Show both apps" : "Split view needs a desktop pointer and at least 1280 pixels of width"} aria-pressed={split} onClick={() => update(current => ({ ...current, mode: "split" }))}>Split view</button>
        <button type="button" disabled={!split} onClick={() => update(current => ({ ...current, order: [...current.order].reverse() }))}>Swap sides</button>
      </div>
    </div>
    {!canSplit && <p className={styles.helper}>One app at a time at this size. Both app states stay open; use the app buttons to switch.</p>}
    {split && <label className={styles.resize}>Pane balance <input aria-label="Left pane width" type="range" min="40" max="60" value={state.ratio} onChange={event => update(current => ({ ...current, ratio: Number(event.target.value) }))} />{state.ratio}%</label>}
    <p className={styles.helper}>Alt + Shift + ← / → focuses an app. Draft recovery is kept in this browser session; save your website to keep it permanently. Other apps open full screen.</p>
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
    {!restored ? <p role="status" className={styles.notice}>Opening Lattice…</p> : <div className={styles.panes} data-split={split} style={{ "--left-pane": `${state.ratio}%` } as CSSProperties}>
      {state.order.map(id => {
        const pane = state.panes.find(item => item.id === id)!;
        const app = describeDesktopApp(pane.href)!;
        return pane.open && <section key={id} id={`desktop-pane-${id}`} tabIndex={-1} ref={element => {paneRefs.current[id]=element;}} className={styles.pane} data-active={activeId === id} hidden={!split && activeId !== id} aria-label={`${app.appKey === "layouts" ? "Layouts" : "Layout Studio"} app pane`}>
          <header className={styles.paneHeader}><strong>{app.label}</strong><span>{pane.dirty ? "Unsaved changes" : app.context.startsWith("website:") ? "Website draft" : "App workspace"}</span><button type="button" onClick={() => { activate(id);update(current => ({ ...current, mode: "single" })); }}>Focus</button><button type="button" aria-label={`Close ${app.appKey === "layouts" ? "Layouts" : "Layout Studio"} pane`} onClick={() => closePane(id)}>×</button></header>
          <div className={styles.paneBody} ref={element => { scrollRefs.current[id] = element; }} tabIndex={0} role="region" aria-label={`${app.label} scrollable content`} onPointerDown={() => { if (stateRef.current.active !== id) update(current => ({...current, active:id})); }}>
            <PaneSessionProvider key={pane.href} adapter={adapters[id]} tabId={getWorkspaceTabId(app)}><AppNavigationProvider value={{ href: pane.href, navigate: href => navigate(id, href) }}>
              {app.appKey === "layouts" ? <TemplateGallery embedded /> : <VisualSiteEditor embedded />}
            </AppNavigationProvider></PaneSessionProvider>
          </div>
        </section>;
      })}
    </div>}
  </main>;
}
