"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GraphDocument, GraphNode } from "@/lib/graph/contracts";
import styles from "./studio-panels.module.css";

type Viewport = "desktop" | "tablet" | "mobile";
type PreviewPayload = { ok?: boolean; html?: string | null; diagnostics?: Array<{ code: string; message: string; nodeId?: string }>; revision?: number; error?: string };
const WIDTHS: Record<Viewport, number> = { desktop: 1280, tablet: 768, mobile: 390 };

export function LuciaStudioWebsitePreview({ websiteId, document, headers, onSelectNode }: {
  websiteId: string; document: GraphDocument; headers: Record<string, string>; onSelectNode: (nodeId: string) => void;
}) {
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [pageId, setPageId] = useState<string>(() => document.nodes.find((node) => node.type === "page" && node.lifecycleStatus === "active")?.id ?? "");
  const [payload, setPayload] = useState<PreviewPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const pages = useMemo(() => document.nodes.filter((node): node is GraphNode & { type: "page" } => node.type === "page" && node.lifecycleStatus === "active")
    .sort((a, b) => String(a.properties.path ?? "").localeCompare(String(b.properties.path ?? ""))), [document]);
  const page = pages.find((item) => item.id === pageId) ?? pages[0];
  const load = useCallback(async (nextPageId: string, nextViewport: Viewport) => {
    if (!nextPageId) { setPayload({ ok: false, error: "Add a page to the graph to preview this website." }); return; }
    setLoading(true);
    try {
      const query = new URLSearchParams({ pageNodeId: nextPageId, viewport: nextViewport });
      const response = await fetch(`/api/websites/${encodeURIComponent(websiteId)}/graph/preview?${query}`, { headers, cache: "no-store" });
      const result = await response.json() as PreviewPayload;
      if (!response.ok) throw new Error(result.error || "Preview could not be rendered.");
      setPayload(result);
    } catch (cause) {
      setPayload({ ok: false, error: cause instanceof Error ? cause.message : "Preview could not be rendered." });
    } finally { setLoading(false); }
  }, [websiteId, headers]);
  useEffect(() => {
    if (pages.length && !pages.some((item) => item.id === pageId)) setPageId(pages[0].id);
    if (!pages.length) setPayload({ ok: false, error: "Add a page to the graph to preview this website." });
  }, [pages, pageId]);
  useEffect(() => { if (page) void load(page.id, viewport); }, [page?.id, viewport, document.revision, load]);
  useEffect(() => {
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    if (!doc || !payload?.ok) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (href.startsWith("#")) return;
      event.preventDefault();
      const destination = pages.find((candidate) => candidate.properties.path === href || (href !== "/" && String(candidate.properties.path ?? "").replace(/\/$/, "") === href.replace(/\/$/, "")));
      if (destination) setPageId(destination.id);
    };
    doc.addEventListener("click", handleClick);
    return () => doc.removeEventListener("click", handleClick);
  }, [payload, pages]);
  const selectPage = (nextId: string) => { setPageId(nextId); };
  return <section className={styles.panel} aria-label="Interactive website preview">
    <div className={styles.panelHeader}>
      <div><p className={styles.eyebrow}>LIVE GRAPH PREVIEW</p><h2>Website preview</h2><p>Graph revision {document.revision}{payload?.revision === document.revision ? " · up to date" : " · refreshing"}</p></div>
      <div className={styles.controls}>
        {(["desktop", "tablet", "mobile"] as const).map((item) => <button key={item} type="button" aria-pressed={viewport === item} onClick={() => setViewport(item)}>{item}</button>)}
        <button type="button" onClick={() => page && void load(page.id, viewport)} disabled={loading || !page}>Refresh</button>
      </div>
    </div>
    <div className={styles.previewNavigation} aria-label="Preview page navigation">
      {pages.map((item) => <button key={item.id} type="button" aria-current={page?.id === item.id ? "page" : undefined} onClick={() => selectPage(item.id)}>{String(item.properties.title ?? "Page")} <small>{String(item.properties.path ?? "/")}</small></button>)}
    </div>
    {loading ? <p className={styles.status} role="status">Rendering graph revision {document.revision}…</p> : null}
    {payload?.error ? <p className={styles.error} role="alert">{payload.error}</p> : null}
    {payload?.diagnostics?.length ? <div className={styles.diagnostics} role="alert"><strong>Preview needs attention</strong>{payload.diagnostics.map((item, index) => <button key={index} type="button" onClick={() => item.nodeId && onSelectNode(item.nodeId)}>{item.code}: {item.message}{item.nodeId ? " · Inspect node" : ""}</button>)}</div> : null}
    {payload?.ok && payload.html ? <div className={styles.frameStage}>
      <iframe ref={frameRef} title={`Website preview — ${String(page?.properties.title ?? "Page")}`} sandbox="allow-same-origin" srcDoc={payload.html} style={{ width: WIDTHS[viewport], maxWidth: "100%", height: "min(72vh, 900px)" }} />
    </div> : null}
    <p className={styles.note}>Preview is read-only. Navigation stays inside the graph’s known local pages. Scripts, forms, popups and top-level navigation are disabled.</p>
  </section>;
}
