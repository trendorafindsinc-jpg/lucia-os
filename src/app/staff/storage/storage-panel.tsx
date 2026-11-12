"use client";
import { useEffect, useState } from "react";
export function StoragePanel() {
  const [usage, setUsage] = useState<{ reservedBytes: number; budgetBytes: number; warning: boolean; scope: string } | null>(null);
  const [notice, setNotice] = useState("Loading storage usage…"), [busy, setBusy] = useState(false);
  async function refresh() {
    const response = await fetch("/api/staff/storage", { cache: "no-store" });
    const body = await response.json(); if (!response.ok) throw Error(body.error || "Storage monitoring unavailable."); setUsage(body); setNotice("");
  }
  useEffect(() => { refresh().catch((error) => setNotice(error.message)); }, []);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/staff/storage", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ websiteId: form.get("websiteId"), quotaBytes: Number(form.get("quotaMB")) * 1000000 }) });
      const body = await response.json(); if (!response.ok) throw Error(body.error); setNotice("Website quota saved and audited.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Quota was not saved."); }
    finally { setBusy(false); }
  }
  return <section className="workspace-card"><p role="status" aria-live="polite">{notice}</p>
    {usage && <><p>{(usage.reservedBytes / 1000000).toFixed(2)} MB reserved of {(usage.budgetBytes / 1000000).toFixed(0)} MB allocated to LUCIA OS.</p><meter value={usage.reservedBytes} max={usage.budgetBytes} aria-label="LUCIA OS reserved storage" /><p>{usage.scope}</p>{usage.warning && <strong>Storage has reached the 80% warning threshold.</strong>}</>}
    <button type="button" onClick={() => refresh().catch((error) => setNotice(error.message))}>Refresh usage</button>
    <h2>Per-website image quota</h2><p>Reducing a quota preserves existing images and blocks further uploads until usage fits. The shared planning budget is 10 GB, across all products; it is not monthly traffic.</p>
    <form className="composition-controls" onSubmit={save}><label>Website ID<input required name="websiteId" maxLength={36} /></label><label>Quota in MB<input required name="quotaMB" type="number" min="0.26" max="100" step="0.01" defaultValue="5" /></label><button disabled={busy}>{busy ? "Saving…" : "Save website quota"}</button></form>
  </section>;
}
