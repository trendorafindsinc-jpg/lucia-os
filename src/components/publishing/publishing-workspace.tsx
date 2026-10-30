"use client";

import Link from "next/link";
import { useWorkspaceTab } from "@/components/workspace/workspace-tab-shell";
import { ContextLease } from "@/lib/workspace/continuity";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useRef } from "react";
import {
  getPublishChecks,
  getPublishReadiness,
  publishSettingsSchema,
} from "@/lib/publishing/publishing";
import { siteDraftSchema, type SiteDraft } from "@/lib/editor/site-draft";
import { siteDraftToLoomBlueprint } from "@/lib/loom/blueprint";
import { LoomRenderer } from "@/components/loom/loom-renderer";

const initialSettings = {
  siteName: "Northstar Studio",
  headline: "Thoughtful work for growing teams",
  description:
    "We help ambitious organisations bring their next idea to life with clarity and confidence.",
  siteSlug: "northstar-studio",
  customDomain: "",
};
type WebsiteChoice = {
  id: string;
  slug: string;
  name: string;
  status: string;
  headline: string;
  description: string;
  revision: string;
  draftValid: boolean;
};

export function PublishingWorkspace() {
  const router = useRouter(),
    search = useSearchParams();
  const { accountId } = useWorkspaceTab();
  const requestedId = search.get("websiteId");
  const lifetime = useRef(new ContextLease());
  const epoch = lifetime.current;
  const [selectedId, setSelectedId] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [settings, setSettings] = useState(initialSettings);
  const [websiteChoices, setWebsiteChoices] = useState<WebsiteChoice[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewDraft, setPreviewDraft] = useState<SiteDraft | null>(null);
  const previewDialog = useRef<HTMLDialogElement>(null);
  const previewTrigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const dialog = previewDialog.current;
    if (!showPreview || !dialog) return;
    const trigger = previewTrigger.current;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      if (trigger?.isConnected) trigger.focus();
    };
  }, [showPreview]);

  const [previewLoading, setPreviewLoading] = useState(false);
  const previewBlueprint = useMemo(
    () => (previewDraft ? siteDraftToLoomBlueprint(previewDraft) : null),
    [previewDraft],
  );
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState("");
  const selected = websiteChoices.find((site) => site.id === selectedId);
  const checks = useMemo(() => getPublishChecks(settings), [settings]);
  const readiness = getPublishReadiness(checks);
  const validation = publishSettingsSchema.safeParse(settings);

  useEffect(() => {
    let active = true;
    const token = epoch.start();
    setSelectedId("");
    setShowPreview(false);
    setPublishedUrl("");
    setIsSaving(false);
    setPreviewLoading(false);
    fetch("/api/publishing/websites", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok)
          throw new Error(
            payload.error || "Sign in with LUCIA ID to load your websites.",
          );
        return payload as { websites: WebsiteChoice[] };
      })
      .then((payload) => {
        if (!active || !epoch.matches(token)) return;
        if (payload.websites.length === 0) {
          setMessage(
            "No saved website yet. Create a website before publishing.",
          );
          return;
        }
        setWebsiteChoices(payload.websites);
        const first = requestedId
          ? payload.websites.find((website) => website.id === requestedId)
          : payload.websites[0];
        if (!first) {
          setMessage(
            "The requested website is unavailable or access was denied. Choose an authorized website.",
          );
          return;
        }
        setSelectedId(first.id);
        setSettings((current) => ({
          ...current,
          siteName: first.name,
          headline: first.headline,
          description: first.description,
          siteSlug: first.slug,
        }));
        setMessage("Loaded a saved website from your LUCIA OS workspace.");
      })
      .catch((error: unknown) => {
        if (active)
          setMessage(
            error instanceof Error
              ? error.message
              : "Your saved websites could not be loaded.",
          );
      });
    return () => {
      active = false;
      epoch.cancel(token);
    };
  }, [requestedId, reloadKey, epoch]);

  function update(field: keyof typeof initialSettings, value: string) {
    setSettings((current) => ({ ...current, [field]: value }));
    setMessage("");
  }

  function selectWebsite(id: string) {
    if (!websiteChoices.some((site) => site.id === id)) return;
    router.replace(`/publish?websiteId=${encodeURIComponent(id)}`);
  }

  async function saveOrPublish(action: "save" | "publish") {
    if (!validation.success || isSaving || !selected?.draftValid) return;
    const token = epoch.version;
    const submittedId = selected.id;
    setIsSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/publishing/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "If-Match": selected.revision,
          ...(accountId ? { "X-LUCIA-Workspace-Account": accountId } : {}),
        },
        cache: "no-store",
        body: JSON.stringify({ ...settings, websiteId: selected.id, action }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "The website could not be saved.");
      if (!epoch.matches(token)) return;
      setWebsiteChoices((current) =>
        current.map((site) =>
          site.id === submittedId
            ? {
                ...site,
                revision: payload.website.revision,
                name: settings.siteName,
                headline: settings.headline,
                description: settings.description,
              }
            : site,
        ),
      );
      if (action === "save") {
        setMessage("Draft saved. Any existing live version remains unchanged.");
      } else {
        setPublishedUrl(payload.url);
        setMessage(
          settings.customDomain
            ? "Your LUCIA subdomain is live. The custom domain is still pending its separate one-time activation and verification."
            : "Your website has been published to its LUCIA subdomain.",
        );
        setWebsiteChoices((current) =>
          current.map((site) =>
            site.id === submittedId
              ? {
                  ...site,
                  status: "published",
                  name: settings.siteName,
                  headline: settings.headline,
                  description: settings.description,
                }
              : site,
          ),
        );
      }
    } catch (error) {
      if (epoch.matches(token))
        setMessage(
          error instanceof Error
            ? error.message
            : "The website could not be saved.",
        );
    } finally {
      if (epoch.matches(token)) setIsSaving(false);
    }
  }

  async function openPreview() {
    if (previewLoading) return;
    const token = epoch.version;
    if (!selected?.draftValid) {
      setMessage("Select a saved website before opening its preview.");
      return;
    }
    setPreviewLoading(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/websites/${encodeURIComponent(selected.id)}/draft`,
        { cache: "no-store" },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(
          payload.error || "We couldn't load this website's draft for preview.",
        );
      if (!epoch.matches(token)) return;
      const parsed = siteDraftSchema.safeParse(payload.draft);
      if (payload.revision !== selected.revision)
        throw new Error(
          "The saved draft changed. Reload saved details before previewing or publishing.",
        );
      if (!parsed.success)
        throw new Error(
          "This draft needs to be saved in Studio before it can be previewed.",
        );
      setPreviewDraft(parsed.data);
      setShowPreview(true);
      setMessage(
        "Private preview of this project's saved draft. Unsaved form details are not included; nothing was published.",
      );
    } catch (error) {
      if (epoch.matches(token))
        setMessage(
          error instanceof Error
            ? error.message
            : "We couldn't open this website's preview.",
        );
    } finally {
      if (epoch.matches(token)) setPreviewLoading(false);
    }
  }

  return (
    <main className="publish-shell">
      <header className="publish-header">
        <Link href="/" className="publish-back">
          ← LUCIA OS
        </Link>
        <span className="publish-status">WEBSITE PUBLISHING</span>
      </header>
      <section className="publish-intro">
        <p className="eyebrow">YOUR WEBSITE, WHEN IT IS READY</p>
        <h1>Prepare to go live.</h1>
        <p>
          Save your draft and publish on your free LUCIA address. Manage
          custom-domain registration and verification on the separate Domains
          page.
        </p>
      </section>

      <div className="publish-layout">
        <section className="publish-panel" aria-labelledby="settings-title">
          <div className="publish-panel-heading">
            <div>
              <p className="eyebrow">01 · WEBSITE DETAILS</p>
              <h2 id="settings-title">Your public address</h2>
            </div>
            <span className="publish-chip">Draft and live snapshot</span>
          </div>
          {websiteChoices.length > 0 ? (
            <label>
              Website to publish
              <select
                value={selectedId}
                disabled={isSaving || previewLoading}
                onChange={(event) => selectWebsite(event.target.value)}
              >
                <option value="" disabled>
                  Select a saved website
                </option>
                {websiteChoices.map((website) => (
                  <option key={website.id} value={website.id}>
                    {website.name} · {website.slug}.lucia.name.ng
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="publish-empty-state">
              <p>
                No saved website is connected to this publishing workspace yet.
              </p>
              <Link href="/create">Create a website</Link> ·{" "}
              <Link href="/workspace/websites">Open your websites</Link>
            </div>
          )}
          <label>
            Website name
            <input
              disabled={isSaving}
              value={settings.siteName}
              maxLength={80}
              onChange={(event) => update("siteName", event.target.value)}
            />
          </label>
          <label>
            Homepage headline
            <input
              disabled={isSaving}
              value={settings.headline}
              maxLength={100}
              onChange={(event) => update("headline", event.target.value)}
            />
          </label>
          <label>
            Short description
            <textarea
              disabled={isSaving}
              value={settings.description}
              maxLength={220}
              rows={3}
              onChange={(event) => update("description", event.target.value)}
            />
          </label>
          <p className="publish-help">
            Address preview:{" "}
            <strong>{settings.siteSlug || "your-site"}.lucia.name.ng</strong> ·
            The server checks that the address is yours and available.
          </p>
          <p className="publish-help">
            <Link href="/workspace/domains">Open domain management ↗</Link> to
            register a custom hostname, follow DNS instructions and verify
            ownership. Domain registration does not activate public routing.
          </p>
          <div className="publish-actions">
            <button
              type="button"
              className="publish-secondary"
              disabled={
                !validation.success || isSaving || !selected?.draftValid
              }
              onClick={() => void saveOrPublish("save")}
            >
              {isSaving ? "Saving…" : "Save draft"}
            </button>
            <button
              type="button"
              className="publish-primary"
              disabled={
                !validation.success || isSaving || !selected?.draftValid
              }
              onClick={() => void saveOrPublish("publish")}
            >
              {isSaving ? "Working…" : "Publish website"}
            </button>
            <button
              type="button"
              className="publish-secondary"
              ref={previewTrigger}
              disabled={previewLoading || isSaving || !selected?.draftValid}
              onClick={() => void openPreview()}
            >
              {previewLoading ? "Loading preview…" : "Preview website"}
            </button>
          </div>
          {!validation.success ? (
            <p className="publish-error" role="status">
              Some details need attention before they can be saved.
            </p>
          ) : null}
          <button
            type="button"
            className="publish-secondary"
            disabled={isSaving || previewLoading}
            onClick={() => {
              if (
                window.confirm(
                  "Reload saved details and discard unsaved publishing-form changes?",
                )
              )
                setReloadKey((value) => value + 1);
            }}
          >
            Reload saved details
          </button>
          {selected && !selected.draftValid && (
            <p role="alert">
              This project has no valid saved editor draft. Open Layout Studio
              to recover it; demo content will not be published.
            </p>
          )}
          {message ? (
            <p className="publish-message" role="status">
              {message}
            </p>
          ) : null}
          {publishedUrl ? (
            <p className="publish-message">
              <a href={publishedUrl} target="_blank" rel="noreferrer">
                Open live website ↗
              </a>
            </p>
          ) : null}
        </section>

        <aside
          className="publish-panel publish-readiness"
          aria-labelledby="readiness-title"
        >
          <div className="publish-panel-heading">
            <div>
              <p className="eyebrow">02 · GO-LIVE CHECKLIST</p>
              <h2 id="readiness-title">Publishing readiness</h2>
            </div>
            <span className="publish-count">
              {readiness.readyCount}/{readiness.total}
            </span>
          </div>
          <p className="publish-readiness-copy">
            The server rechecks ownership and permission before saving or
            publishing. Custom-domain activation is not required for a LUCIA
            subdomain.
          </p>
          <ul className="publish-check-list">
            {checks.map((check) => (
              <li
                key={check.id}
                className={check.ready ? "is-ready" : "is-blocked"}
              >
                <span className="check-symbol" aria-hidden="true">
                  {check.ready ? "✓" : "•"}
                </span>
                <div>
                  <strong>{check.label}</strong>
                  <p>{check.detail}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="publish-help">
            Wildcard routing uses the verified *.lucia.name.ng domain attached
            to the shared Vercel project. Each customer website remains in the
            shared deployment.
          </p>
        </aside>
      </div>

      {showPreview && previewDraft && previewBlueprint ? (
        <dialog
          ref={previewDialog}
          className="publish-modal-backdrop"
          aria-label="Saved website preview"
          onCancel={(event) => {
            event.preventDefault();
            setShowPreview(false);
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowPreview(false);
          }}
        >
          <section
            className="publish-preview"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="publish-preview-top">
              <span>Private preview · Not published</span>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                aria-label="Close preview"
                autoFocus
              >
                Close ×
              </button>
            </div>
            <div className="publish-preview-renderer" id="preview-title">
              <LoomRenderer blueprint={previewBlueprint} preview />
            </div>
            <p className="publish-preview-note">
              This is the selected saved website rendered by Loom. Preview does
              not change the live site.
            </p>
          </section>
        </dialog>
      ) : null}
    </main>
  );
}
