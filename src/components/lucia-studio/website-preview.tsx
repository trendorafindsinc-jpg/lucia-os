"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GraphDocument, GraphNode } from "@/lib/graph/contracts";
import styles from "./studio-panels.module.css";

type Viewport = "desktop" | "tablet" | "mobile";
const WIDTHS: Record<Viewport, number> = { desktop: 1280, tablet: 768, mobile: 390 };

export function LuciaStudioWebsitePreview({ websiteId, organizationId, document, onSelectNode }: {
  websiteId: string; organizationId: string; document: GraphDocument; onSelectNode: (nodeId: string) => void;
}) {
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [pageId, setPageId] = useState<string>(() => document.nodes.find((node) => node.type === "page" && node.lifecycleStatus === "active")?.id ?? "");
  const [loading, setLoading] = useState(true);
  const [frameVersion, setFrameVersion] = useState(0);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const pages = useMemo(() => document.nodes.filter((node): node is GraphNode & { type: "page" } => node.type === "page" && node.lifecycleStatus === "active")
    .sort((a, b) => String(a.properties.path ?? "").localeCompare(String(b.properties.path ?? ""))), [document]);
  const page = pages.find((item) => item.id === pageId) ?? pages[0];
  const previewUrl = useMemo(() => {
    if (!page) return undefined;
    const query = new URLSearchParams({
      websiteId, organizationId, pageNodeId: page.id, viewport, revision: String(document.revision),
    });
    return `/studio/preview?${query.toString()}`;
  }, [websiteId, organizationId, page?.id, viewport, document.revision]);
  useEffect(() => {
    if (pages.length && !pages.some((item) => item.id === pageId)) setPageId(pages[0].id);
    if (!pages.length) setLoading(false);
  }, [pages, pageId]);
  useEffect(() => { setLoading(Boolean(previewUrl)); }, [previewUrl]);
  useEffect(() => {
    const doc = frameRef.current?.contentDocument;
    if (!doc) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const diagnostic = target.closest("[data-lucia-node-id]");
      if (diagnostic) {
        event.preventDefault();
        const nodeId = diagnostic.getAttribute("data-lucia-node-id");
        if (nodeId) onSelectNode(nodeId);
        return;
      }
      const anchor = target.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (href.startsWith("#")) return;
      event.preventDefault();
      const destination = pages.find((candidate) => candidate.properties.path === href ||
        (href !== "/" && String(candidate.properties.path ?? "").replace(/\/$/, "") === href.replace(/\/$/, "")));
      if (destination) setPageId(destination.id);
    };
    doc.addEventListener("click", handleClick);
    return () => doc.removeEventListener("click", handleClick);
  }, [frameVersion, pages, onSelectNode]);
  const handleLoad = useCallback(() => {
    setLoading(false);
    setFrameVersion((version) => version + 1);
  }, []);
  return <section className={styles.panel} aria-label="Interactive website preview">
    <div className={styles.panelHeader}>
      <div><p className={styles.eyebrow}>LIVE GRAPH PREVIEW</p><h2>Website preview</h2><p>Saved graph revision {document.revision}</p></div>
      <div className={styles.controls}>
        {(["desktop", "tablet", "mobile"] as const).map((item) => <button key={item} type="button" aria-pressed={viewport === item} onClick={() => setViewport(item)}>{item}</button>)}
        <button type="button" onClick={() => { setLoading(true); setFrameVersion((version) => version + 1); if (frameRef.current && previewUrl) frameRef.current.src = previewUrl; }} disabled={loading || !page}>Refresh</button>
      </div>
    </div>
    <div className={styles.previewNavigation} aria-label="Preview page navigation">
      {pages.map((item) => <button key={item.id} type="button" aria-current={page?.id === item.id ? "page" : undefined} onClick={() => setPageId(item.id)}>{String(item.properties.title ?? "Page")} <small>{String(item.properties.path ?? "/")}</small></button>)}
    </div>
    {loading ? <p className={styles.status} role="status">Rendering graph revision {document.revision}…</p> : null}
    {!pages.length ? <p className={styles.empty}>Add a page to the graph to preview this website.</p> : null}
    {previewUrl ? <div className={styles.frameStage}>
      <iframe key={previewUrl} ref={frameRef} title={`Website preview — ${String(page?.properties.title ?? "Page")}`} sandbox="allow-same-origin" src={previewUrl}
        onLoad={handleLoad} onError={() => setLoading(false)}
        style={{ width: WIDTHS[viewport], maxWidth: "100%", height: "min(72vh, 900px)" }} />
    </div> : null}
    <p className={styles.note}>Preview is read-only and reflects the saved graph revision shown above; unsaved inspector drafts are not included. Navigation stays inside known local graph pages. Scripts, forms, popups and top-level navigation are disabled.</p>
  </section>;
}
