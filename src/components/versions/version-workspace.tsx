"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { makeInitialDraft, siteDraftSchema, type SiteDraft } from "@/lib/editor/site-draft";
import { makeInitialStructure } from "@/lib/site-structure/structure";
import { defaultSeoSettings } from "@/lib/seo/seo-settings";
import { formatVersionDate, restoreVersion, type WebsiteSnapshot } from "@/lib/versions/version-history";

type SavedVersion = { id: string; label: string; notes: string; createdAt: string; snapshot: WebsiteSnapshot };
const initialStructure = makeInitialStructure();

function toSnapshot(draft: SiteDraft): WebsiteSnapshot {
  return {
    siteName: draft.siteName, headline: draft.headline, description: draft.description,
    palette: draft.palette, visibleSections: [...draft.visibleSections],
    pages: initialStructure.pages.map((page) => ({ ...page, sectionTypes: [...page.sectionTypes] })),
    seoTitle: defaultSeoSettings.title, seoDescription: defaultSeoSettings.description,
    contentPostCount: 0, templateId: draft.templateId, buttonLabel: draft.buttonLabel,
  } as WebsiteSnapshot;
}

function fromSnapshot(snapshot: WebsiteSnapshot, current: SiteDraft): SiteDraft {
  const candidate = {
    ...current, siteName: snapshot.siteName, headline: snapshot.headline,
    description: snapshot.description, palette: snapshot.palette,
    visibleSections: [...snapshot.visibleSections],
    templateId: "templateId" in snapshot && typeof snapshot.templateId === "string" ? snapshot.templateId : current.templateId,
    buttonLabel: "buttonLabel" in snapshot && typeof snapshot.buttonLabel === "string" ? snapshot.buttonLabel : current.buttonLabel,
  };
  return siteDraftSchema.parse(candidate);
}

export function VersionWorkspace() {
  const searchParams = useSearchParams();
  const websiteId = searchParams.get("websiteId") ?? "";
  const [draft, setDraft] = useState<SiteDraft>(() => makeInitialDraft("northstar-consulting"));
  const [history, setHistory] = useState<SavedVersion[]>([]);
  const [label, setLabel] = useState("Website checkpoint");
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState<WebsiteSnapshot | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const snapshot = useMemo(() => toSnapshot(draft), [draft]);

  const load = useCallback(async () => {
    if (!websiteId) { setLoading(false); setMessage("Open Version history from a saved website to continue. No demo data will be saved."); return; }
    setLoading(true);
    try {
      const [draftResponse, versionsResponse] = await Promise.all([
        fetch(`/api/websites/${encodeURIComponent(websiteId)}/draft`, { cache: "no-store" }),
        fetch(`/api/websites/${encodeURIComponent(websiteId)}/versions`, { cache: "no-store" }),
      ]);
      const draftData = await draftResponse.json();
      const versionsData = await versionsResponse.json();
      if (!draftResponse.ok) throw new Error(draftData.error || "Couldn't load this website.");
      if (!versionsResponse.ok) throw new Error(versionsData.error || "Couldn't load version history.");
      const base = makeInitialDraft(draftData.draft?.templateId || "northstar-consulting");
      const validDraft = siteDraftSchema.safeParse({ ...base, ...(draftData.draft ?? {}), siteName: draftData.draft?.siteName || draftData.website?.name || base.siteName });
      if (validDraft.success) setDraft(validDraft.data);
      setHistory(Array.isArray(versionsData.versions) ? versionsData.versions : []);
      setMessage("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Couldn't load version history."); }
    finally { setLoading(false); }
  }, [websiteId]);

  useEffect(() => { void load(); }, [load]);

  async function saveVersion() {
    if (!websiteId || busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/websites/${encodeURIComponent(websiteId)}/versions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, notes, snapshot }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Couldn't save this checkpoint.");
      setLabel("Website checkpoint"); setNotes("");
      await load(); setMessage("Checkpoint saved to this website's version history.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Couldn't save this checkpoint."); }
    finally { setBusy(false); }
  }

  async function restoreToDraft(version: SavedVersion) {
    if (!websiteId || busy) return;
    const next = fromSnapshot(restoreVersion(version as never), draft);
    if (!window.confirm(`Restore “${version.label}” into the editable draft? This will save draft content, but will NOT publish the website.`)) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/websites/${encodeURIComponent(websiteId)}/draft`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Couldn't restore this checkpoint.");
      setDraft(next); setPreview(null);
      setMessage("Checkpoint restored to the saved draft only. The live website was not published or changed.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Couldn't restore this checkpoint."); }
    finally { setBusy(false); }
  }

  return (
    <main className="version-shell">
      <header className="version-header">
        <div><Link href="/" className="version-back">← LUCIA OS</Link><p className="version-eyebrow">DRAFT HISTORY</p><h1>Drafts, preview &amp; rollback</h1><p className="version-intro">Create durable checkpoints for a selected website and restore a checkpoint to its editable draft. Publishing remains a separate action.</p></div>
        <span className="version-local-badge">{websiteId ? "Saved website" : "Website required"}</span>
      </header>
      {!websiteId ? <section className="version-panel"><h2>Select a saved website first</h2><p>Open a website from your workspace, then open Version history with its website ID. This page will not create a fake website or save sample data.</p><Link href="/workspace/websites">Go to Websites →</Link></section> : null}
      <div className="version-layout">
        <section className="version-panel">
          <div className="version-panel-heading"><div><p className="version-eyebrow">CURRENT SAVED DRAFT</p><h2>Checkpoint details</h2></div><span className="version-count">{history.length}/25 versions</span></div>
          <p>{draft.siteName}</p><p>{draft.headline}</p>
          <label>Version name<input value={label} onChange={(event) => setLabel(event.target.value)} maxLength={80} /></label>
          <label>Notes (optional)<textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} rows={3} placeholder="What changed or why this checkpoint matters" /></label>
          <div className="version-actions"><button type="button" onClick={saveVersion} disabled={!websiteId || loading || busy}>{busy ? "Working…" : "Save checkpoint"}</button><button type="button" className="version-secondary" onClick={() => setPreview(snapshot)} disabled={loading}>Preview current draft</button><button type="button" className="version-secondary" onClick={() => void load()} disabled={busy}>Refresh history</button></div>
          {loading ? <p role="status">Loading saved website and history…</p> : null}
          {message ? <p className="version-message" role="status">{message}</p> : null}
        </section>
        <section className="version-panel version-history-panel">
          <div className="version-panel-heading"><div><p className="version-eyebrow">CHECKPOINTS</p><h2>Version history</h2></div></div>
          {history.length === 0 ? <div className="version-empty"><strong>No saved checkpoints yet</strong><p>Save a checkpoint before experimenting. Restoring changes the saved draft only, never publishes automatically.</p></div> : <ol className="version-list">{history.map((version) => <li key={version.id} className="version-item"><div className="version-item-copy"><strong>{version.label}</strong><time dateTime={version.createdAt}>{formatVersionDate(version.createdAt)}</time>{version.notes ? <p>{version.notes}</p> : null}<span>{version.snapshot.siteName} · {version.snapshot.visibleSections.length} homepage sections</span></div><div className="version-item-actions"><button type="button" className="version-secondary" onClick={() => setPreview(version.snapshot)}>Preview</button><button type="button" onClick={() => void restoreToDraft(version)} disabled={busy}>Restore to draft</button></div></li>)}</ol>}
          <p className="version-footnote">Restore writes only to the editable draft. It does not publish or overwrite the current live version.</p>
        </section>
      </div>
      {preview ? <div className="version-preview-backdrop" role="presentation" onClick={() => setPreview(null)}><section className="version-preview" role="dialog" aria-modal="true" aria-labelledby="preview-title" onClick={(event) => event.stopPropagation()}><div className="version-preview-top"><span className="version-eyebrow">PRIVATE DRAFT PREVIEW</span><button type="button" className="version-close" onClick={() => setPreview(null)} aria-label="Close preview">×</button></div><div className={`version-preview-canvas palette-${preview.palette}`}><span className="version-preview-brand">{preview.siteName}</span><div className="version-preview-content"><span className="version-eyebrow">A WEBSITE DRAFT</span><h2 id="preview-title">{preview.headline}</h2><p>{preview.description}</p><span className="version-preview-cta">Get in touch ↗</span></div><div className="version-preview-sections">{preview.visibleSections.map((section, index) => <span key={`${section}-${index}`}>{section.replace(/-/g, " ")}</span>)}</div></div><p className="version-footnote">Preview only. This does not publish content or change the live website.</p></section></div> : null}
    </main>
  );
}
