"use client";

import { useMemo, useState } from "react";
import { defaultSeoSettings, getSeoChecks, seoSettingsSchema, type SeoSettings } from "@/lib/seo/seo-settings";

export function SeoWorkspace() {
  const [settings, setSettings] = useState<SeoSettings>(defaultSeoSettings);
  const checks = useMemo(() => getSeoChecks(settings), [settings]);
  const valid = seoSettingsSchema.safeParse(settings).success;
  const update = (patch: Partial<SeoSettings>) => setSettings((current) => ({ ...current, ...patch }));
  const socialTitle = settings.socialTitle || settings.title || settings.pageName;
  const socialDescription = settings.socialDescription || settings.description;
  return <section className="seo-workspace" aria-label="SEO settings workspace">
    <div className="seo-workspace-head"><div><span className="seo-kicker">PAGE SETTINGS</span><h2>Search and sharing details</h2></div><span className="seo-validation-pill">{valid ? "Fields valid" : "Review URL or text fields"}</span></div>
    <div className="seo-workspace-grid">
      <div className="seo-form-panel">
        <div className="seo-fields">
          <label>Page name <input value={settings.pageName} maxLength={120} onChange={(e) => update({ pageName: e.target.value })} /></label>
          <label>Search title <input value={settings.title} maxLength={70} onChange={(e) => update({ title: e.target.value })} placeholder="Clear, specific page title" /><small>{settings.title.length}/70 characters</small></label>
          <label>Search description <textarea value={settings.description} maxLength={200} rows={4} onChange={(e) => update({ description: e.target.value })} placeholder="Summarise the page in plain language." /><small>{settings.description.length}/200 characters</small></label>
          <label>Canonical URL <input type="url" value={settings.canonicalUrl} onChange={(e) => update({ canonicalUrl: e.target.value })} placeholder="https://yourdomain.com/page" /><small>Use the final HTTPS URL for this page. Leave blank until the domain is confirmed.</small></label>
          <label>Social preview image URL <input type="url" value={settings.socialImageUrl} onChange={(e) => update({ socialImageUrl: e.target.value })} placeholder="https://yourdomain.com/social-card.jpg" /><small>Use a public image URL; 1200 × 630 px is a useful starting point.</small></label>
          <div className="seo-toggle-row"><div><strong>Allow search indexing</strong><small>Turn off for private, staging or unfinished pages.</small></div><input aria-label="Allow search indexing" type="checkbox" checked={settings.indexable} onChange={(e) => update({ indexable: e.target.checked })} /></div>
          <div className="seo-toggle-row"><div><strong>Allow crawlers to follow links</strong><small>Independent of whether this page can be indexed.</small></div><input aria-label="Allow crawlers to follow links" type="checkbox" checked={settings.followLinks} onChange={(e) => update({ followLinks: e.target.checked })} /></div>
          <details className="seo-advanced"><summary>Social-specific title and description</summary><div className="seo-fields seo-nested"><label>Social title<input value={settings.socialTitle} maxLength={70} onChange={(e) => update({ socialTitle: e.target.value })} placeholder="Use search title if blank" /></label><label>Social description<textarea value={settings.socialDescription} maxLength={200} rows={3} onChange={(e) => update({ socialDescription: e.target.value })} placeholder="Use search description if blank" /></label></div></details>
        </div>
      </div>
      <aside className="seo-preview-column">
        <section className="seo-preview-card"><div className="seo-preview-head"><span className="seo-kicker">SEARCH PREVIEW</span><span>{settings.title.length}/70</span></div><div className="seo-search-result"><div className="seo-search-domain">yourdomain.com › page</div><h3>{settings.title || "Your page title"}</h3><p>{settings.description || "Your page description will appear here when configured."}</p></div><p className="seo-preview-note">Illustrative preview only. Search engines may rewrite titles and snippets.</p></section>
        <section className="seo-preview-card"><div className="seo-preview-head"><span className="seo-kicker">SOCIAL PREVIEW</span><span>Open Graph · X</span></div><div className="seo-social-card">{settings.socialImageUrl ? <img src={settings.socialImageUrl} alt="Social preview image from the configured URL" onError={(e) => { e.currentTarget.style.display = "none"; }} /> : <div className="seo-social-placeholder"><span aria-hidden="true">↗</span><strong>Social image preview</strong><small>Add a public HTTPS image URL</small></div>}<div className="seo-social-copy"><span>YOURDOMAIN.COM</span><h3>{socialTitle || "Your page title"}</h3><p>{socialDescription || "A short summary for social sharing."}</p></div></div><p className="seo-preview-note">The remote image may not load in this preview. It is not uploaded by this workspace.</p></section>
        <section className="seo-checklist"><div className="seo-preview-head"><span className="seo-kicker">READINESS CHECKS</span><span>{checks.filter((c) => c.status === "good").length}/{checks.length}</span></div>{checks.map((check) => <div className="seo-check" key={check.label}><span className={"seo-check-mark seo-check-mark--" + check.status}>{check.status === "good" ? "✓" : check.status === "error" ? "!" : "·"}</span><div><strong>{check.label}</strong><p>{check.detail}</p></div></div>)}</section>
      </aside>
    </div>
    <div className="seo-workspace-foot"><span>{settings.indexable ? "Indexing allowed in preview" : "Preview will set noindex"}</span><span>Local state only · No metadata applied to a live page</span></div>
  </section>;
}
