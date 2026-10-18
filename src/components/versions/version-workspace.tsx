"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { makeInitialDraft } from "@/lib/editor/site-draft";
import { makeInitialStructure } from "@/lib/site-structure/structure";
import { defaultSeoSettings } from "@/lib/seo/seo-settings";
import { addVersion, formatVersionDate, restoreVersion, type VersionHistory, type WebsiteSnapshot } from "@/lib/versions/version-history";

const initialDraft = makeInitialDraft("business-studio");
const initialStructure = makeInitialStructure();

export function VersionWorkspace() {
  const [siteName, setSiteName] = useState(initialDraft.siteName);
  const [headline, setHeadline] = useState(initialDraft.headline);
  const [description, setDescription] = useState(initialDraft.description);
  const [palette, setPalette] = useState<WebsiteSnapshot["palette"]>(initialDraft.palette);
  const [visibleSections, setVisibleSections] = useState<string[]>(initialDraft.visibleSections);
  const [seoTitle, setSeoTitle] = useState(defaultSeoSettings.title);
  const [seoDescription, setSeoDescription] = useState(defaultSeoSettings.description);
  const [history, setHistory] = useState<VersionHistory>([]);
  const [label, setLabel] = useState("Website draft");
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState<WebsiteSnapshot | null>(null);
  const [message, setMessage] = useState("");

  const snapshot = useMemo<WebsiteSnapshot>(() => ({
    siteName, headline, description, palette, visibleSections: [...visibleSections],
    pages: initialStructure.pages.map((page) => ({ ...page, sectionTypes: [...page.sectionTypes] })),
    seoTitle, seoDescription, contentPostCount: 0,
  }), [siteName, headline, description, palette, visibleSections, seoTitle, seoDescription]);

  function saveVersion() {
    try {
      setHistory((current) => addVersion(current, { label, notes, snapshot }));
      setMessage("Version saved in this browser session.");
      setLabel("Website draft");
      setNotes("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save this version.");
    }
  }

  function rollBack(versionId: string) {
    const version = history.find((item) => item.id === versionId);
    if (!version) return;
    const restored = restoreVersion(version);
    setSiteName(restored.siteName);
    setHeadline(restored.headline);
    setDescription(restored.description);
    setPalette(restored.palette);
    setVisibleSections(restored.visibleSections);
    setSeoTitle(restored.seoTitle);
    setSeoDescription(restored.seoDescription);
    setPreview(null);
    setMessage(`Restored “${version.label}” as the current working draft. Save a new version to keep this state in history.`);
  }

  return (
    <main className="version-shell">
      <header className="version-header">
        <div><Link href="/" className="version-back">← LUCIA OS</Link><p className="version-eyebrow">PHASE 13 · DRAFT SAFETY</p><h1>Drafts, preview &amp; rollback</h1><p className="version-intro">Save named checkpoints before making changes, preview a checkpoint, and restore it when you need to go back.</p></div>
        <span className="version-local-badge">Session-only prototype</span>
      </header>
      <div className="version-layout">
        <section className="version-panel">
          <div className="version-panel-heading"><div><p className="version-eyebrow">CURRENT WORKING DRAFT</p><h2>Edit a safe test draft</h2></div><span className="version-count">{history.length}/25 versions</span></div>
          <label>Website name<input value={siteName} onChange={(event) => setSiteName(event.target.value)} maxLength={80} /></label>
          <label>Homepage headline<input value={headline} onChange={(event) => setHeadline(event.target.value)} maxLength={100} /></label>
          <label>Homepage description<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={220} rows={3} /></label>
          <label>Colour palette<select value={palette} onChange={(event) => setPalette(event.target.value as WebsiteSnapshot["palette"])}><option value="original">Original</option><option value="ocean">Ocean</option><option value="forest">Forest</option><option value="sunset">Sunset</option></select></label>
          <label>Search title<input value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} maxLength={70} /></label>
          <label>Search description<textarea value={seoDescription} onChange={(event) => setSeoDescription(event.target.value)} maxLength={200} rows={3} /></label>
          <label>Version name<input value={label} onChange={(event) => setLabel(event.target.value)} maxLength={80} /></label>
          <label>Notes (optional)<textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} rows={2} placeholder="What changed or why this checkpoint matters" /></label>
          <div className="version-actions"><button type="button" onClick={saveVersion}>Save version</button><button type="button" className="version-secondary" onClick={() => setPreview(snapshot)}>Preview current draft</button></div>
          {message ? <p className="version-message" role="status">{message}</p> : null}
        </section>
        <section className="version-panel version-history-panel">
          <div className="version-panel-heading"><div><p className="version-eyebrow">CHECKPOINTS</p><h2>Version history</h2></div></div>
          {history.length === 0 ? <div className="version-empty"><strong>No saved versions yet</strong><p>Save a checkpoint before experimenting. Your current draft remains editable.</p></div> : <ol className="version-list">{history.map((version) => <li key={version.id} className="version-item"><div className="version-item-copy"><strong>{version.label}</strong><time dateTime={version.createdAt}>{formatVersionDate(version.createdAt)}</time>{version.notes ? <p>{version.notes}</p> : null}<span>{version.snapshot.siteName} · {version.snapshot.visibleSections.length} homepage sections</span></div><div className="version-item-actions"><button type="button" className="version-secondary" onClick={() => setPreview(version.snapshot)}>Preview</button><button type="button" onClick={() => rollBack(version.id)}>Restore</button></div></li>)}</ol>}
          <p className="version-footnote">Restoring updates this workspace’s current draft; it does not publish or change a live website.</p>
        </section>
      </div>
      {preview ? <div className="version-preview-backdrop" role="presentation" onClick={() => setPreview(null)}><section className="version-preview" role="dialog" aria-modal="true" aria-labelledby="preview-title" onClick={(event) => event.stopPropagation()}><div className="version-preview-top"><span className="version-eyebrow">PRIVATE DRAFT PREVIEW</span><button type="button" className="version-close" onClick={() => setPreview(null)} aria-label="Close preview">×</button></div><div className={`version-preview-canvas palette-${preview.palette}`}><span className="version-preview-brand">{preview.siteName}</span><div className="version-preview-content"><span className="version-eyebrow">A WEBSITE DRAFT</span><h2 id="preview-title">{preview.headline}</h2><p>{preview.description}</p><span className="version-preview-cta">Get in touch ↗</span></div><div className="version-preview-sections">{preview.visibleSections.map((section, index) => <span key={`${section}-${index}`}>{section.replace(/-/g, " ")}</span>)}</div></div><p className="version-footnote">Preview only. This does not create a public URL, change SEO metadata on a live page, or publish content.</p></section></div> : null}
    </main>
  );
}
