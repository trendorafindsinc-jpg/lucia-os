"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getPublishChecks, getPublishReadiness, publishSettingsSchema } from "@/lib/publishing/publishing";
import { makeInitialDraft, siteDraftSchema, type SiteDraft } from "@/lib/editor/site-draft";
import { siteDraftToLoomBlueprint } from "@/lib/loom/blueprint";
import { LoomRenderer } from "@/components/loom/loom-renderer";

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
  const [previewDraft, setPreviewDraft] = useState<SiteDraft | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewBlueprint = useMemo(() => previewDraft ? siteDraftToLoomBlueprint(previewDraft) : null, [previewDraft]);
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
        if (!active) return;
        if (payload.websites.length === 0) {
          setMessage("No saved website yet. Create a website before publishing.");
          return;
        }
        setWebsiteChoices(payload.websites);
        const requestedWebsiteId = new URLSearchParams(window.location.search).get("websiteId");
        const first = payload.websites.find((website) => website.id === requestedWebsiteId) ?? payload.websites[0];
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

  async function openPreview() {
    if (previewLoading) return;
    const selected = websiteChoices.find((website) => website.slug === settings.siteSlug);
    if (!selected) {
      setMessage("Select a saved website before opening its preview.");
      return;
    }
    setPreviewLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/websites/${encodeURIComponent(selected.id)}/draft`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "We couldn't load this website's draft for preview.");
      const base = makeInitialDraft(payload.draft?.templateId || "northstar-consulting");
      const parsed = siteDraftSchema.safeParse({
        ...base,
        ...(payload.draft ?? {}),
        siteName: settings.siteName,
        headline: settings.headline,
        description: settings.description,
      });
      if (!parsed.success) throw new Error("This draft needs to be saved in Studio before it can be previewed.");
      setPreviewDraft(parsed.data);
      setShowPreview(true);
      setMessage("Private preview loaded using the selected website's Loom composition. It has not been published.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We couldn't open this website's preview.");
    } finally {
      setPreviewLoading(false);
    }
  }

  return (
    <main className="publish-shell">
      <header className="publish-header">
        <Link href="/" className="publish-back">← LUCIA OS</Link>
        <span className="publish-status">WEBSITE PUBLISHING</span>
      </header>
      <section className="publish-intro">
        <p className="eyebrow">YOUR WEBSITE, WHEN IT IS READY</p>
        <h1>Prepare to go live.</h1>
        <p>Save your draft and publish on your free LUCIA address. Manage custom-domain registration and verification on the separate Domains page.</p>
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
            <div className="publish-empty-state">
              <p>No saved website is connected to this publishing workspace yet.</p>
              <Link href="/create">Create a website</Link> · <Link href="/workspace/websites">Open your websites</Link>
            </div>
          )}
          <label>Website name<input value={settings.siteName} maxLength={80} onChange={(event) => update("siteName", event.target.value)} /></label>
          <label>Homepage headline<input value={settings.headline} maxLength={100} onChange={(event) => update("headline", event.target.value)} /></label>
          <label>Short description<textarea value={settings.description} maxLength={220} rows={3} onChange={(event) => update("description", event.target.value)} /></label>
          <p className="publish-help">Address preview: <strong>{settings.siteSlug || "your-site"}.lucia.name.ng</strong> · The server checks that the address is yours and available.</p>
          <p className="publish-help"><Link href="/workspace/domains">Open domain management ↗</Link> to register a custom hostname, follow DNS instructions and verify ownership. Domain registration does not activate public routing.</p>
          <div className="publish-actions">
            <button type="button" className="publish-secondary" disabled={!validation.success || isSaving || websiteChoices.length === 0} onClick={() => void saveOrPublish("save")}>{isSaving ? "Saving…" : "Save draft"}</button>
            <button type="button" className="publish-primary" disabled={!validation.success || isSaving || websiteChoices.length === 0} onClick={() => void saveOrPublish("publish")}>{isSaving ? "Working…" : "Publish website"}</button>
            <button type="button" className="publish-secondary" disabled={previewLoading || websiteChoices.length === 0} onClick={() => void openPreview()}>{previewLoading ? "Loading preview…" : "Preview website"}</button>
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

      {showPreview && previewDraft && previewBlueprint ? <div className="publish-modal-backdrop" role="presentation" onClick={() => setShowPreview(false)}><section className="publish-preview" role="dialog" aria-modal="true" aria-labelledby="preview-title" onClick={(event) => event.stopPropagation()}><div className="publish-preview-top"><span>Private preview · Not published</span><button type="button" onClick={() => setShowPreview(false)} aria-label="Close preview">Close ×</button></div><div className="publish-preview-renderer" id="preview-title"><LoomRenderer blueprint={previewBlueprint} preview /></div><p className="publish-preview-note">This is the selected saved website rendered by Loom. Preview does not change the live site.</p></section></div> : null}
    </main>
  );
}
