"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GraphDocument } from "@/lib/graph/contracts";
import { compareGraphRevisions } from "@/lib/studio/history-diff";
import styles from "./studio-panels.module.css";

type Version = { id: string; revision: number; contentHash: string; createdAt: string | Date };
type HistoryPayload = { versions?: Version[]; error?: string };
type SnapshotPayload = { version?: { snapshot: GraphDocument }; error?: string };

export function LuciaStudioHistoryPanel({ websiteId, document, headers, onRestored }: {
  websiteId: string; document: GraphDocument; headers: Record<string, string>; onRestored: () => Promise<void>;
}) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [snapshot, setSnapshot] = useState<GraphDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState("");
  const selected = versions.find((version) => version.id === selectedId);
  const diff = useMemo(() => snapshot ? compareGraphRevisions(document, snapshot) : null, [document, snapshot]);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/websites/${encodeURIComponent(websiteId)}/graph/history`, { headers, cache: "no-store" });
      const result = await response.json() as HistoryPayload;
      if (!response.ok) throw new Error(result.error || "Revision history could not be loaded.");
      const list = result.versions ?? [];
      setVersions(list);
      setSelectedId((current) => current && list.some((version) => version.id === current) ? current : list.find((version) => version.revision < document.revision)?.id ?? list[0]?.id ?? "");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Revision history could not be loaded."); }
    finally { setLoading(false); }
  }, [websiteId, headers, document.revision]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!selectedId) { setSnapshot(null); return; }
    let cancelled = false;
    void (async () => {
      try {
        const query = new URLSearchParams({ versionId: selectedId });
        const response = await fetch(`/api/websites/${encodeURIComponent(websiteId)}/graph/history?${query}`, { headers, cache: "no-store" });
        const result = await response.json() as SnapshotPayload;
        if (!response.ok) throw new Error(result.error || "Revision snapshot could not be loaded.");
        if (!cancelled) setSnapshot(result.version?.snapshot ?? null);
      } catch (cause) { if (!cancelled) setError(cause instanceof Error ? cause.message : "Revision snapshot could not be loaded."); }
    })();
    return () => { cancelled = true; };
  }, [websiteId, headers, selectedId]);
  const restore = async () => {
    if (!selected || selected.revision === document.revision) return;
    if (!window.confirm(`Restore revision ${selected.revision} as a new graph revision? The current revision will remain in history.`)) return;
    setRestoring(true); setError("");
    try {
      const response = await fetch(`/api/websites/${encodeURIComponent(websiteId)}/graph/mutations`, {
        method: "POST", headers,
        body: JSON.stringify({ websiteId, expectedRevision: document.revision, idempotencyKey: crypto.randomUUID(),
          operationSchemaVersion: 1, operations: [{ type: "RESTORE_VERSION", versionId: selected.id }] }),
      });
      const result = await response.json() as { error?: string; revision?: number };
      if (!response.ok) throw new Error(result.error || "Revision restore failed.");
      await onRestored();
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Revision restore failed."); }
    finally { setRestoring(false); }
  };
  return <section className={styles.panel} aria-label="Revision history">
    <div className={styles.panelHeader}><div><p className={styles.eyebrow}>IMMUTABLE GRAPH SNAPSHOTS</p><h2>Revision history</h2><p>Current revision {document.revision}</p></div><button type="button" onClick={() => void load()} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button></div>
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    {!versions.length && !loading ? <p className={styles.empty}>No saved revisions found.</p> : null}
    <label className={styles.historySelect}>Compare current revision with
      <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
        {versions.map((version) => <option key={version.id} value={version.id}>Revision {version.revision} · {new Date(version.createdAt instanceof Date ? version.createdAt.getTime() : version.createdAt).toLocaleString()}</option>)}
      </select>
    </label>
    {selected && snapshot && diff ? <>
      <p className={styles.note}>Revision {selected.revision} · SHA-256 {selected.contentHash.slice(0, 16)}…</p>
      <div className={styles.diffSummary}>
        <span>{diff.addedNodes.length} nodes added</span><span>{diff.removedNodes.length} removed</span><span>{diff.changedNodes.length} changed</span><span>{diff.addedEdges} relationships added</span><span>{diff.removedEdges} removed</span>
      </div>
      {diff.changedNodes.map((change) => <article className={styles.diffItem} key={change.after.id}><strong>{change.after.type} · {String(change.after.properties.title ?? change.after.properties.name ?? change.after.id.slice(0, 8))}</strong><small>Changed node {change.after.id.slice(0, 8)}</small></article>)}
      {diff.addedNodes.map((node) => <article className={styles.diffItem} key={node.id}><strong>Added · {node.type}</strong><small>{node.id.slice(0, 8)}</small></article>)}
      {diff.removedNodes.map((node) => <article className={styles.diffItem} key={node.id}><strong>Removed · {node.type}</strong><small>{node.id.slice(0, 8)}</small></article>)}
      <button type="button" onClick={() => void restore()} disabled={restoring || selected.revision === document.revision}>{restoring ? "Restoring…" : `Restore revision ${selected.revision} as new revision`}</button>
      <p className={styles.note}>Restore never rewrites history. It creates a new revision using the selected immutable snapshot and the current expected revision.</p>
    </> : null}
  </section>;
}
