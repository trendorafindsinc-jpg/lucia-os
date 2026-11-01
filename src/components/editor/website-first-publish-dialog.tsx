"use client";

import { useEffect, useRef, useState } from "react";
import { publishSettingsSchema } from "@/lib/publishing/publishing";

/** Inline handoff to the existing authorized publishing API: no duplicate publishing engine. */
type WebsiteChoice = {
  id: string;
  slug: string;
  name: string;
  headline: string;
  description: string;
  revision: string;
  draftValid: boolean;
};

export function WebsiteFirstPublishDialog({
  websiteId, accountId, onClose,
}: {
  websiteId: string;
  accountId?: string | null;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [website, setWebsite] = useState<WebsiteChoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState("");
  const [publishedUrl, setPublishedUrl] = useState("");

  useEffect(() => {
    const node = dialog.current;
    if (node && !node.open) node.showModal();
    return () => { if (node?.open) node.close(); };
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch("/api/publishing/websites", {
          cache: "no-store",
          headers: accountId ? { "x-lucia-workspace-account": accountId } : {},
        });
        const payload = await response.json();
        if (!response.ok) throw Error(payload.error || "Could not load publishing details.");
        const found = (payload.websites as WebsiteChoice[]).find((item) => item.id === websiteId);
        if (!found) throw Error("This website is unavailable or publishing access was denied.");
        if (active) setWebsite(found);
      } catch (error) {
        if (active) setNotice(error instanceof Error ? error.message : "Publishing details are unavailable.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [websiteId, accountId]);

  const settings = website ? {
    siteName: website.name,
    headline: website.headline,
    description: website.description,
    siteSlug: website.slug,
    customDomain: "",
  } : null;
  const valid = settings && publishSettingsSchema.safeParse(settings).success;

  async function publish() {
    if (!website || !settings || !valid || publishing) return;
    setPublishing(true);
    setNotice("");
    try {
      const response = await fetch("/api/publishing/publish", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "If-Match": website.revision,
          ...(accountId ? { "x-lucia-workspace-account": accountId } : {}),
        },
        body: JSON.stringify({ ...settings, websiteId, action: "publish" }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "Publishing failed. Your previous live website was preserved.");
      setPublishedUrl(result.url);
      setNotice("Publication confirmed. Your saved website is now the published version.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Publishing could not be confirmed. Your live version was preserved.");
    } finally {
      setPublishing(false);
    }
  }

  return <dialog ref={dialog} className="website-first-publish-dialog"
    aria-labelledby="website-first-publish-title"
    onCancel={(event) => { if (publishing) event.preventDefault(); else onClose(); }}
    onClose={onClose}>
    <header className="website-first-publish-heading">
      <div><p className="website-first-publish-kicker">LAYOUT STUDIO</p><h2 id="website-first-publish-title">Publish your website</h2></div>
      <button type="button" onClick={onClose} disabled={publishing} aria-label="Close publishing">✕</button>
    </header>
    {loading ? <p role="status">Checking your saved website and publishing permission…</p> :
      <div>
        {website && <div className="website-first-publish-summary">
          <strong>{website.name}</strong>
          <span>{website.slug}.lucia.name.ng</span>
          <p>Publishing will update the public website. Your current saved draft remains available to edit.</p>
        </div>}
        {website && !website.draftValid && <p role="alert">This saved draft needs correction before publishing. Return to editing and save a valid website.</p>}
        {website && !valid && <p role="alert">Your website name, headline or description needs attention. Edit your website and save it before publishing.</p>}
        {notice && <p className={publishedUrl ? "website-first-publish-success" : "website-first-publish-error"} role="status">{notice}</p>}
        {publishedUrl && <p><a href={publishedUrl} target="_blank" rel="noopener noreferrer">View published website ↗</a></p>}
        <div className="website-first-publish-actions">
          <button type="button" onClick={onClose} disabled={publishing}>Return to website</button>
          <button type="button" className="website-first-editor-publish" onClick={() => void publish()}
            disabled={publishing || !website?.draftValid || !valid || Boolean(publishedUrl)}>
            {publishing ? "Publishing…" : publishedUrl ? "Published" : "Publish website"}
          </button>
        </div>
      </div>}
  </dialog>;
}
