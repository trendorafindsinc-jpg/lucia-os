"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getPublishChecks, getPublishReadiness, publishSettingsSchema } from "@/lib/publishing/publishing";

const initialSettings = {
  siteName: "Northstar Studio",
  headline: "Thoughtful work for growing teams",
  description: "We help ambitious organisations bring their next idea to life with clarity and confidence.",
  siteSlug: "northstar-studio",
  customDomain: "",
};
type WebsiteChoice = { id: string; slug: string; name: string; status: string; headline: string; description: string };

export function PublishingWorkspace() {
  const [settings, setSettings] = useState(initialSettings);
  const [websiteChoices, setWebsiteChoices] = useState<WebsiteChoice[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState("");
  const checks = useMemo(() => getPublishChecks(settings), [settings]);
  const readiness = getPublishReadiness(checks);
  const validation = publishSettingsSchema.safeParse(settings);

  useEffect(() => {
    let active = true;
    fetch("/api/publishing/websites", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Sign in with LUCIA ID to load your websites.");
        return payload as { websites: WebsiteChoice[] };
      })
      .then((payload) => {
        if (!active || payload.websites.length === 0) return;
        setWebsiteChoices(payload.websites);
        const first = payload.websites[0];
        setSettings((current) => ({
          ...current, siteName: first.name, headline: first.headline,
          description: first.description, siteSlug: first.slug,
        }));
        setMessage("Loaded a saved website from your LUCIA OS workspace.");
      })
      .catch((error: unknown) => {
        if (active) setMessage(error instanceof Error ? error.message : "Your saved websites could not be loaded.");
      });
    return () => { active = false; };
  }, []);

  function update(field: keyof typeof initialSettings, value: string) {
    setSettings((current) => ({ ...current, [field]: value }));
    setMessage("");
  }

  function selectWebsite(slug: string) {
    const website = websiteChoices.find((choice) => choice.slug === slug);
    if (!website) return;
    setSettings((current) => ({
      ...current, siteSlug: website.slug, siteName: website.name,
      headline: website.headline, description: website.description,
    }));
    setPublishedUrl("");
    setMessage("");
  }

  async function saveOrPublish(action: "save" | "publish") {
    if (!validation.success || isSaving) return;
    setIsSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/publishing/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ ...settings, action }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "The website could not be saved.");
      if (action === "save") {
        setMessage("Draft saved. Any existing live version remains unchanged.");
      } else {
        setPublishedUrl(payload.url);
        setMessage(settings.customDomain
          ? "Your LUCIA subdomain is live. The custom domain is still pending its separate one-time activation and verification."
          : "Your website has been published to its LUCIA subdomain.");
        setWebsiteChoices((current) => current.map((site) => site.slug === settings.siteSlug ? { ...site, status: "published", name: settings.siteName, headline: settings.headline, description: settings.description } : site));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The website could not be saved.");
    } finally {
      setIsSaving(false);
    }
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
        <p>Save your draft and publish on your free LUCIA address. Your custom domain remains separate until its one-time activation and verification are complete.</p>
      </section>

      <div className="publish-layout">
        <section className="publish-panel" aria-labelledby="settings-title">
          <div className="publish-panel-heading"><div><p className="eyebrow">01 · WEBSITE DETAILS</p><h2 id="settings-title">Your public address</h2></div><span className="publish-chip">Draft and live snapshot</span></div>
          {websiteChoices.length > 0 ? (
            <label>Website to publish
              <select value={settings.siteSlug} onChange={(event) => selectWebsite(event.target.value)}>
                {websiteChoices.map((website) => <option key={website.id} value={website.slug}>{website.name} · {website.slug}.lucia.name.ng</option>)}
              </select>
            </label>
          ) : (
            <label>Website address slug<input value={settings.siteSlug} maxLength={48} onChange={(event) => update("siteSlug", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""))} aria-describedby="slug-help" /><span id="slug-help" className="publish-help">Enter the exact address slug used when you created the website.</span></label>
          )}
          <label>Website name<input value={settings.siteName} maxLength={80} onChange={(event) => update("siteName", event.target.value)} /></label>
          <label>Homepage headline<input value={settings.headline} maxLength={100} onChange={(event) => update("headline", event.target.value)} /></label>
          <label>Short description<textarea value={settings.description} maxLength={220} rows={3} onChange={(event) => update("description", event.target.value)} /></label>
          <p className="publish-help">Address preview: <strong>{settings.siteSlug || "your-site"}.lucia.name.ng</strong> · The server checks that the address is yours and available.</p>
          <label>Custom domain (optional)<input value={settings.customDomain} placeholder="www.yourdomain.com" onChange={(event) => update("customDomain", event.target.value)} aria-describedby="domain-help" /><span id="domain-help" className="publish-help">Enter a hostname only, without https:// or a page path. Custom-domain activation is a separate one-time payment and is not connected yet.</span></label>
          {settings.customDomain.trim() ? <div className="dns-guide"><strong>Custom domain not connected</strong><p>Publishing below will use your LUCIA subdomain. No custom-domain payment is taken here; the future shared payment workflow and DNS/TLS verification must complete before this hostname can go live.</p></div> : null}
          <div className="publish-actions">
            <button type="button" className="publish-secondary" disabled={!validation.success || isSaving} onClick={() => void saveOrPublish("save")}>{isSaving ? "Saving…" : "Save draft"}</button>
            <button type="button" className="publish-primary" disabled={!validation.success || isSaving} onClick={() => void saveOrPublish("publish")}>{isSaving ? "Working…" : "Publish website"}</button>
            <button type="button" className="publish-secondary" onClick={() => { setSettings(initialSettings); setMessage("Example settings restored. Select a saved website before saving or publishing."); setShowPreview(false); setPublishedUrl(""); }}>Reset example</button>
            <button type="button" className="publish-secondary" onClick={() => { setShowPreview(true); setMessage("Private preview opened. It does not change the live website."); }}>Preview website</button>
          </div>
          {!validation.success ? <p className="publish-error" role="status">Some details need attention before they can be saved.</p> : null}
          {message ? <p className="publish-message" role="status">{message}</p> : null}
          {publishedUrl ? <p className="publish-message"><a href={publishedUrl} target="_blank" rel="noreferrer">Open live website ↗</a></p> : null}
        </section>

        <aside className="publish-panel publish-readiness" aria-labelledby="readiness-title">
          <div className="publish-panel-heading"><div><p className="eyebrow">02 · GO-LIVE CHECKLIST</p><h2 id="readiness-title">Publishing readiness</h2></div><span className="publish-count">{readiness.readyCount}/{readiness.total}</span></div>
          <p className="publish-readiness-copy">The server rechecks ownership and permission before saving or publishing. Custom-domain activation is not required for a LUCIA subdomain.</p>
          <ul className="publish-check-list">{checks.map((check) => <li key={check.id} className={check.ready ? "is-ready" : "is-blocked"}><span className="check-symbol" aria-hidden="true">{check.ready ? "✓" : "•"}</span><div><strong>{check.label}</strong><p>{check.detail}</p></div></li>)}</ul>
          <p className="publish-help">Wildcard routing uses the verified *.lucia.name.ng domain attached to the shared Vercel project. Each customer website remains in the shared deployment.</p>
        </aside>
      </div>

      {showPreview ? <div className="publish-modal-backdrop" role="presentation" onClick={() => setShowPreview(false)}><section className="publish-preview" role="dialog" aria-modal="true" aria-labelledby="preview-title" onClick={(event) => event.stopPropagation()}><div className="publish-preview-top"><span>Private preview · Not published</span><button type="button" onClick={() => setShowPreview(false)} aria-label="Close preview">Close ×</button></div><div className="publish-preview-content"><p className="eyebrow">{settings.siteName || "Your organisation"}</p><h2 id="preview-title">{settings.headline || "Your headline will appear here"}</h2><p>{settings.description || "Add a short description to introduce your organisation."}</p><span className="publish-preview-cta">Preview only · Not live</span></div></section></div> : null}
    </main>
  );
}
