"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getPublishChecks, getPublishReadiness, publishSettingsSchema } from "@/lib/publishing/publishing";

const initialSettings = {
  siteName: "Northstar Studio",
  headline: "Thoughtful work for growing teams",
  description: "We help ambitious organisations bring their next idea to life with clarity and confidence.",
  siteSlug: "northstar-studio",
  customDomain: "",
};

export function PublishingWorkspace() {
  const [settings, setSettings] = useState(initialSettings);
  const [showPreview, setShowPreview] = useState(false);
  const [message, setMessage] = useState("");
  const checks = useMemo(() => getPublishChecks(settings), [settings]);
  const readiness = getPublishReadiness(checks);
  const validation = publishSettingsSchema.safeParse(settings);

  function update(field: keyof typeof initialSettings, value: string) {
    setSettings((current) => ({ ...current, [field]: value }));
    setMessage("");
  }

  return (
    <main className="publish-shell">
      <header className="publish-header">
        <Link href="/" className="publish-back">← LUCIA OS</Link>
        <span className="publish-status">Phase 14 · Publishing &amp; domains</span>
      </header>
      <section className="publish-intro">
        <p className="eyebrow">YOUR WEBSITE, WHEN IT IS READY</p>
        <h1>Prepare to go live.</h1>
        <p>Review your website address, check publishing requirements, and preview how your site could appear. This workspace does not publish a live website or claim a domain is connected.</p>
      </section>

      <div className="publish-layout">
        <section className="publish-panel" aria-labelledby="settings-title">
          <div className="publish-panel-heading"><div><p className="eyebrow">01 · WEBSITE DETAILS</p><h2 id="settings-title">Your public address</h2></div><span className="publish-chip">Draft only</span></div>
          <label>Website name<input value={settings.siteName} maxLength={80} onChange={(event) => update("siteName", event.target.value)} /></label>
          <label>Homepage headline<input value={settings.headline} maxLength={100} onChange={(event) => update("headline", event.target.value)} /></label>
          <label>Short description<textarea value={settings.description} maxLength={220} rows={3} onChange={(event) => update("description", event.target.value)} /></label>
          <label>Free LUCIA address<input value={settings.siteSlug} maxLength={48} onChange={(event) => update("siteSlug", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""))} aria-describedby="slug-help" /><span id="slug-help" className="publish-help">Address preview: <strong>{settings.siteSlug || "your-site"}.lucia.site</strong> · Availability is not checked.</span></label>
          <label>Custom domain (optional)<input value={settings.customDomain} placeholder="www.yourdomain.com" onChange={(event) => update("customDomain", event.target.value)} aria-describedby="domain-help" /><span id="domain-help" className="publish-help">Enter a hostname only, without https:// or a page path.</span></label>
          {settings.customDomain.trim() ? <div className="dns-guide"><strong>When domain connection is available</strong><p>Your domain owner will need to add the DNS records supplied by LUCIA, then complete ownership verification. No DNS values are shown here because a production domain target has not been configured.</p></div> : null}
          <div className="publish-actions"><button type="button" className="publish-primary" onClick={() => { setShowPreview(true); setMessage("Preview opened. This is a private, illustrative preview, not a published URL."); }}>Preview website</button><button type="button" className="publish-secondary" onClick={() => { setSettings(initialSettings); setMessage("The example settings have been reset."); setShowPreview(false); }}>Reset example</button></div>
          {!validation.success ? <p className="publish-error" role="status">Some details need attention before they can be saved.</p> : null}
          {message ? <p className="publish-message" role="status">{message}</p> : null}
        </section>

        <aside className="publish-panel publish-readiness" aria-labelledby="readiness-title">
          <div className="publish-panel-heading"><div><p className="eyebrow">02 · GO-LIVE CHECKLIST</p><h2 id="readiness-title">Publishing readiness</h2></div><span className="publish-count">{readiness.readyCount}/{readiness.total}</span></div>
          <p className="publish-readiness-copy">Publishing stays disabled until every required production safeguard is in place.</p>
          <ul className="publish-check-list">{checks.map((check) => <li key={check.id} className={check.ready ? "is-ready" : "is-blocked"}><span className="check-symbol" aria-hidden="true">{check.ready ? "✓" : "•"}</span><div><strong>{check.label}</strong><p>{check.detail}</p></div></li>)}</ul>
          <button className="publish-primary publish-disabled" type="button" disabled title="Production publishing is not configured">Publish website · Not available yet</button>
          <p className="publish-help">This is an honest readiness assessment, not a successful deployment or domain verification.</p>
        </aside>
      </div>

      {showPreview ? <div className="publish-modal-backdrop" role="presentation" onClick={() => setShowPreview(false)}><section className="publish-preview" role="dialog" aria-modal="true" aria-labelledby="preview-title" onClick={(event) => event.stopPropagation()}><div className="publish-preview-top"><span>Private preview · Not published</span><button type="button" onClick={() => setShowPreview(false)} aria-label="Close preview">Close ×</button></div><div className="publish-preview-content"><p className="eyebrow">{settings.siteName || "Your organisation"}</p><h2 id="preview-title">{settings.headline || "Your headline will appear here"}</h2><p>{settings.description || "Add a short description to introduce your organisation."}</p><span className="publish-preview-cta">Discover more ↗</span></div></section></div> : null}
    </main>
  );
}
