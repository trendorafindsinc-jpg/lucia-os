"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getTemplateById, websiteTemplates } from "@/lib/templates/catalogue";
import { editorPalettes, makeInitialDraft, moveSection, siteDraftSchema, type EditorPaletteId, type SiteDraft } from "@/lib/editor/site-draft";
import { loomBlueprintSchema, siteDraftToLoomBlueprint, type LoomBlueprint } from "@/lib/loom/blueprint";
import { LoomRenderer } from "@/components/loom/loom-renderer";

export function VisualSiteEditor() {
  const [draft, setDraft] = useState<SiteDraft>(() => makeInitialDraft("northstar-consulting"));
  const [notice, setNotice] = useState("");
  const [websiteId, setWebsiteId] = useState("");
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveLabel, setSaveLabel] = useState("Unsaved changes");
  const [aiBrief, setAiBrief] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiProposal, setAiProposal] = useState<LoomBlueprint | null>(null);
  const [aiError, setAiError] = useState("");
  const template = getTemplateById(draft.templateId);
  const validation = useMemo(() => siteDraftSchema.safeParse(draft), [draft]);
  const previewBlueprint = useMemo(() => siteDraftToLoomBlueprint(validation.success ? validation.data : makeInitialDraft(draft.templateId)), [draft, validation]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("template");
    const savedWebsiteId = params.get("websiteId");
    if (requested && getTemplateById(requested)) setDraft(makeInitialDraft(requested));
    if (!savedWebsiteId) return;
    setWebsiteId(savedWebsiteId);
    setIsLoadingSaved(true);
    fetch(`/api/websites/${encodeURIComponent(savedWebsiteId)}/draft`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Couldn't open this saved website.");
        const base = makeInitialDraft(data.draft?.templateId || requested || "northstar-consulting");
        setDraft({ ...base, ...(data.draft ?? {}), siteName: data.draft?.siteName || data.website?.name || base.siteName });
        setSaveLabel("Saved draft loaded");
      })
      .catch((error: unknown) => setNotice(error instanceof Error ? error.message : "Couldn't load this website draft."))
      .finally(() => setIsLoadingSaved(false));
  }, []);

  function update<K extends keyof SiteDraft>(key: K, value: SiteDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaveLabel("Unsaved changes");
    setNotice("");
  }

  async function saveDraft() {
    if (!websiteId) {
      setNotice("Open a saved website from Websites before saving changes.");
      return;
    }
    const checked = siteDraftSchema.safeParse(draft);
    if (!checked.success) {
      setNotice("Please correct the highlighted draft fields before saving.");
      return;
    }
    setIsSaving(true);
    setNotice("");
    try {
      const response = await fetch(`/api/websites/${encodeURIComponent(websiteId)}/draft`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checked.data),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Couldn't save your changes.");
      setSaveLabel("Saved just now");
      setNotice("Your website draft is saved to your LUCIA OS workspace. It is not published.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Couldn't save your changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function generateAIProposal() {
    if (!websiteId) {
      setAiError("Open a saved website first so LoomifiAI can verify your workspace access.");
      return;
    }
    if (aiBrief.trim().length < 20) {
      setAiError("Add at least 20 characters describing the website you want.");
      return;
    }
    setAiBusy(true);
    setAiError("");
    setAiProposal(null);
    try {
      const response = await fetch("/api/loomifi-ai/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ websiteId, brief: aiBrief.trim() }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const message = typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
          ? data.error
          : "LoomifiAI couldn't create a proposal. Your draft is unchanged.";
        throw new Error(message);
      }
      const candidate = typeof data === "object" && data !== null && "proposal" in data ? data.proposal : null;
      const checked = loomBlueprintSchema.safeParse(candidate);
      if (!checked.success) throw new Error("The design proposal didn't pass LUCIA's safety checks. Your draft is unchanged.");
      setAiProposal(checked.data);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "LoomifiAI is temporarily unavailable. Your draft is unchanged.");
    } finally {
      setAiBusy(false);
    }
  }

  function applyAIProposalToEditor() {
    if (!aiProposal) return;
    const page = aiProposal.pages.find((item) => item.path === "/") ?? aiProposal.pages[0];
    const hero = page?.sections.find((section) => section.type === "hero");
    const labels = page?.sections.flatMap((section) => {
      if (section.type === "content-grid") return section.items.map((item) => item.title);
      if (section.type === "call-to-action" || section.type === "contact") return [section.heading];
      return [];
    }).filter((label, index, all) => label.trim().length > 0 && all.indexOf(label) === index).slice(0, 12) ?? [];
    const next: SiteDraft = {
      ...draft,
      siteName: aiProposal.site.name,
      headline: hero?.heading ?? aiProposal.site.name,
      description: hero?.body ?? aiProposal.site.description,
      buttonLabel: hero?.actionLabel ?? "Get in touch",
      palette: aiProposal.theme.palette,
      visibleSections: labels.length ? labels : ["Home"],
    };
    const checked = siteDraftSchema.safeParse(next);
    if (!checked.success) {
      setAiError("This proposal can't be mapped safely into the visual editor. Your draft is unchanged.");
      return;
    }
    setDraft(checked.data);
    setSaveLabel("Unsaved changes");
    setNotice("Proposal applied to the editor only. Review the fields, then choose Save draft when you're ready.");
    setAiProposal(null);
    setAiError("");
  }

  function toggleSection(section: string) {
    const visible = draft.visibleSections.includes(section);
    if (visible && draft.visibleSections.length === 1) {
      setNotice("Keep at least one section on your page.");
      return;
    }
    update("visibleSections", visible ? draft.visibleSections.filter((item) => item !== section) : [...draft.visibleSections, section]);
  }

  return (
    <main className="editor-page">
      <header className="editor-topbar">
        <Link className="wordmark" href="/" aria-label="LUCIA OS home"><span className="brand-mark" aria-hidden="true">L</span><span>LUCIA <span className="muted-word">OS</span></span></Link>
        <div className="editor-topbar-actions"><span className="editor-unsaved">{isLoadingSaved ? "Opening saved draft…" : isSaving ? "Saving…" : websiteId ? saveLabel : "Preview only · Not saved"}</span><Link className="editor-back-link" href="/pages">Pages & navigation ↗</Link>{websiteId ? <Link className="editor-back-link" href={`/publish?websiteId=${encodeURIComponent(websiteId)}`}>Publish website ↗</Link> : null}<Link className="editor-back-link" href="/workspace/websites">Back to Websites</Link></div>
      </header>
      <section className="editor-heading">
        <p className="eyebrow">VISUAL WEBSITE EDITOR</p>
        <h1>Shape your website.</h1>
        <p>Shape the layout and colours, then save changes to your workspace. Saving stores a draft; publishing is a separate step.</p>
      </section>
      <div className="editor-workspace">
        <aside className="editor-panel" aria-label="Website editing controls">
          <div className="editor-panel-heading"><div><span className="editor-kicker">YOUR WEBSITE</span><h2>Content & style</h2></div><span className="editor-live-dot">Live preview</span></div>
          <section className="loomifi-card" aria-labelledby="loomifi-title">
            <div className="loomifi-card-top"><span className="loomifi-spark" aria-hidden="true">✳</span><div><span className="editor-kicker">DESIGN ASSISTANT</span><h3 id="loomifi-title">LoomifiAI</h3></div><span className="loomifi-beta">Preview</span></div>
            <p>Describe the website you imagine. Get a design proposal you can review before changing your draft.</p>
            <label className="loomifi-brief-label" htmlFor="loomifi-brief">What should your website do?</label>
            <textarea id="loomifi-brief" value={aiBrief} maxLength={4000} rows={4} placeholder="E.g. A calm, premium website for a Lagos architecture studio, with a strong portfolio, services and a clear enquiry path…" onChange={(event) => setAiBrief(event.target.value)} />
            <div className="loomifi-card-footer"><span>{aiBrief.length}/4,000</span><button type="button" className="loomifi-generate" onClick={generateAIProposal} disabled={!websiteId || aiBusy || aiBrief.trim().length < 20}>{aiBusy ? "Creating…" : "Create proposal"} <span aria-hidden="true">↗</span></button></div>
            {!websiteId && <p className="loomifi-helper">Open a saved website to enable AI design proposals.</p>}
            {aiError && <p className="loomifi-error" role="alert">{aiError}</p>}
            {aiProposal && <p className="loomifi-helper" role="status">Proposal ready below. Nothing has been saved or published.</p>}
          </section>
          <label className="editor-field">Starting design<select value={draft.templateId} onChange={(event) => { setDraft(makeInitialDraft(event.target.value)); setSaveLabel("Unsaved changes"); setNotice(""); }}>{websiteTemplates.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <label className="editor-field">Website name<input value={draft.siteName} maxLength={80} onChange={(event) => update("siteName", event.target.value)} /></label>
          <label className="editor-field">Main headline<input value={draft.headline} maxLength={100} onChange={(event) => update("headline", event.target.value)} /></label>
          <label className="editor-field">Introduction<textarea value={draft.description} maxLength={220} rows={4} onChange={(event) => update("description", event.target.value)} /></label>
          <label className="editor-field">Button text<input value={draft.buttonLabel} maxLength={32} onChange={(event) => update("buttonLabel", event.target.value)} /></label>
          <fieldset className="editor-palette-field"><legend>Colour mood</legend><div className="editor-palette-options">{(Object.keys(editorPalettes) as EditorPaletteId[]).map((palette) => <button type="button" key={palette} className={draft.palette === palette ? "editor-palette is-selected" : "editor-palette"} aria-pressed={draft.palette === palette} onClick={() => update("palette", palette)}><span>{editorPalettes[palette].map((color) => <i key={color} style={{ background: color }} />)}</span><small>{palette[0].toUpperCase() + palette.slice(1)}</small></button>)}</div></fieldset>
          <fieldset className="editor-sections-field"><legend>Page sections</legend><p>Show, hide and reorder the sections on your page.</p><div className="editor-section-list">{(template?.sections ?? draft.visibleSections).map((section) => { const index = draft.visibleSections.indexOf(section); const visible = index !== -1; return <div className={visible ? "editor-section-row" : "editor-section-row is-hidden"} key={section}><label><input type="checkbox" checked={visible} onChange={() => toggleSection(section)} /><span>{section}</span></label><div><button type="button" aria-label={`Move ${section} up`} disabled={!visible || index === 0} onClick={() => update("visibleSections", moveSection(draft.visibleSections, index, -1))}>↑</button><button type="button" aria-label={`Move ${section} down`} disabled={!visible || index === draft.visibleSections.length - 1} onClick={() => update("visibleSections", moveSection(draft.visibleSections, index, 1))}>↓</button></div></div>; })}</div></fieldset>
          {notice && <p className="editor-notice" role="status">{notice}</p>}
          {!validation.success && <p className="editor-notice" role="status">Some fields need a little more text before this draft can be considered valid.</p>}
          <div className="editor-panel-actions"><button type="button" className="editor-reset" onClick={() => { setDraft(makeInitialDraft(draft.templateId)); setSaveLabel("Unsaved changes"); setNotice("The editor preview was reset. Save to update the stored draft."); }}>Reset design</button><button type="button" className="editor-done" onClick={saveDraft} disabled={!websiteId || isSaving || !validation.success}>{isSaving ? "Saving…" : "Save draft"}</button></div>
        </aside>
        <section className="editor-preview-wrap" aria-label="Live website preview">
          <div className="editor-preview-toolbar"><span><i /> Preview</span><span>Desktop concept</span></div>
          {aiProposal && <section className="loomifi-proposal-review" aria-label="LoomifiAI proposal review">
            <div className="loomifi-review-heading"><div><span className="editor-kicker">YOUR PROPOSAL</span><h2>{aiProposal.site.name}</h2><p>AI-generated concept · Review before applying</p></div><button type="button" className="loomifi-dismiss" onClick={() => setAiProposal(null)} aria-label="Dismiss proposal">×</button></div>
            <div className="loomifi-proposal-canvas"><LoomRenderer blueprint={aiProposal} preview /></div>
            <div className="loomifi-review-actions"><span>Private preview only. Your live website is unchanged.</span><button type="button" className="editor-done" onClick={applyAIProposalToEditor}>Apply to editor</button></div>
          </section>}
          <div className="editor-loom-preview"><LoomRenderer blueprint={previewBlueprint} preview /></div>
          <p className="editor-preview-caption">{websiteId ? "Changes can be saved to your organisation’s website draft. This preview is private; it is not a public website." : "Illustrative preview. Open a saved website from your Websites library to enable persistent saving."}</p>
        </section>
      </div>
      <footer className="editor-page-footer"><span>{draft.visibleSections.length} visible sections</span><span>{websiteId ? "Draft saving is connected · Publishing remains separate" : "Preview only · Open a saved website to save changes"}</span><span>{validation.success ? "Draft fields valid" : "Check draft fields"}</span></footer>
    </main>
  );
}
