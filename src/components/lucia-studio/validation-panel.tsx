"use client";

import { useCallback, useEffect, useState } from "react";
import type { GraphDocument } from "@/lib/graph/contracts";
import styles from "./studio-panels.module.css";

type Finding = { code: string; severity: "error" | "warning" | "info"; message: string; nodeId?: string; edgeId?: string; propertyPath?: Array<string | number>; source: string };
type Payload = { revision?: number; diagnostics?: Finding[]; counts?: { errors: number; warnings: number; info: number }; error?: string };

export function LuciaStudioValidationPanel({ websiteId, document, headers, onSelectNode }: {
  websiteId: string; document: GraphDocument; headers: Record<string, string>; onSelectNode: (nodeId: string) => void;
}) {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(false);
  const run = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/websites/${encodeURIComponent(websiteId)}/graph/validation`, { headers, cache: "no-store" });
      const result = await response.json() as Payload;
      if (!response.ok) throw new Error(result.error || "Validation could not be completed.");
      setPayload(result);
    } catch (cause) {
      setPayload({ error: cause instanceof Error ? cause.message : "Validation could not be completed." });
    } finally { setLoading(false); }
  }, [websiteId, headers]);
  useEffect(() => { void run(); }, [run, document.revision]);
  return <section className={styles.panel} aria-label="Website validation">
    <div className={styles.panelHeader}><div><p className={styles.eyebrow}>DETERMINISTIC CHECKS</p><h2>Validation</h2><p>Graph revision {document.revision}</p></div><button type="button" onClick={() => void run()} disabled={loading}>{loading ? "Checking…" : "Run again"}</button></div>
    {payload?.error ? <p className={styles.error} role="alert">{payload.error}</p> : null}
    {payload?.counts ? <div className={styles.validationCounts}><span>{payload.counts.errors} errors</span><span>{payload.counts.warnings} warnings</span><span>{payload.counts.info} info</span></div> : null}
    {payload?.diagnostics?.length ? <div className={styles.findings}>{payload.diagnostics.map((item, index) => <article className={styles.finding} key={index}>
      <div><strong>{item.code}</strong><span data-severity={item.severity}>{item.severity}</span></div><p>{item.message}</p>
      <small>{item.source}{item.propertyPath?.length ? " · " + item.propertyPath.join(".") : ""}{item.edgeId ? " · edge " + item.edgeId.slice(0, 8) : ""}</small>
      {item.nodeId ? <button type="button" onClick={() => onSelectNode(item.nodeId!)}>Open affected node · {item.nodeId.slice(0, 8)}</button> : null}
    </article>)}</div> : payload && !payload.error ? <p className={styles.success} role="status">No validation issues found for this graph revision.</p> : null}
  </section>;
}
