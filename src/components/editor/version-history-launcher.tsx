"use client";

import { useEffect, useState } from "react";
import { siteDraftSchema, type SiteDraft } from "@/lib/editor/site-draft";
import type { WebsiteSnapshot } from "@/lib/versions/version-history";

type SavedVersion = {
  id: string;
  label: string;
  notes: string;
  createdAt: string;
  snapshot: WebsiteSnapshot;
};

function toSnapshot(draft: SiteDraft): WebsiteSnapshot {
  return {
    siteName: draft.siteName,
    headline: draft.headline,
    description: draft.description,
    palette: draft.palette,
    visibleSections: [...draft.visibleSections],
    pages: [{
      id: "home",
      title: "Home",
      slug: "",
      sectionTypes: [...draft.visibleSections],
    }],
    seoTitle: draft.siteName.slice(0, 70),
    seoDescription: draft.description.slice(0, 200),
    contentPostCount: 0,
  };
}

function restoreSnapshot(snapshot: WebsiteSnapshot, current: SiteDraft): SiteDraft {
  return siteDraftSchema.parse({
    ...current,
    siteName: snapshot.siteName,
    headline: snapshot.headline,
    description: snapshot.description,
    palette: snapshot.palette,
    visibleSections: snapshot.visibleSections,
  });
}

export function VersionHistoryLauncher() {
  const [websiteId, setWebsiteId] = useState("");
  const [versions, setVersions] = useState<SavedVersion[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("websiteId");
    if (id) setWebsiteId(id);
  }, []);

  async function loadVersions() {
    if (!websiteId) {
      setNotice("Open a saved website from Websites to use version history.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(`/api/websites/${encodeURIComponent(websiteId)}/versions`, { cache: "no-store" });
      const data: unknown = await response.json();
      if (!response.ok) throw new Error(typeof data === "object" && data !== null && "error" in data && typeof data.error === "string" ? data.error : "Couldn't load versions.");
      const list = typeof data === "object" && data !== null && "versions" in data && Array.isArray(data.versions) ? data.versions as SavedVersion[] : [];
      setVersions(list);
      setOpen(true);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Couldn't load version history.");
    } finally {
      setBusy(false);
    }
  }

  async function saveCheckpoint() {
    if (!websiteId) return setNotice("Open a saved website from Websites to save a checkpoint.");
    setBusy(true);
    setNotice("");
    try {
      const draftResponse = await fetch(`/api/websites/${encodeURIComponent(websiteId)}/draft`, { cache: "no-store" });
      const draftData = await draftResponse.json();
      if (!draftResponse.ok) throw new Error(draftData.error || "Couldn't read the saved draft.");
      const draft = siteDraftSchema.safeParse(draftData.draft);
      if (!draft.success) throw new Error("The saved draft needs to be valid before creating a checkpoint.");
      const response = await fetch(`/api/websites/${encodeURIComponent(websiteId)}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ label: `Checkpoint ${new Date().toLocaleString()}`, notes: "Saved draft checkpoint", snapshot: toSnapshot(draft.data) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Couldn't save this checkpoint.");
      await loadVersions();
      setNotice("Checkpoint saved from the stored draft. Unsaved editor changes are not included.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Couldn't save a checkpoint.");
    } finally {
      setBusy(false);
    }
  }

  async function restoreVersion(version: SavedVersion) {
    if (!websiteId || !window.confirm(`Restore “${version.label}” to the saved draft? This will not publish the website.`)) return;
    setBusy(true);
    setNotice("");
    try {
      const draftResponse = await fetch(`/api/websites/${encodeURIComponent(websiteId)}/draft`, { cache: "no-store" });
      const draftData = await draftResponse.json();
      if (!draftResponse.ok) throw new Error(draftData.error || "Couldn't read the saved draft.");
      const current = siteDraftSchema.safeParse(draftData.draft);
      if (!current.success) throw new Error("The current saved draft needs attention before it can be restored.");
      const restored = restoreSnapshot(version.snapshot, current.data);
      const response = await fetch(`/api/websites/${encodeURIComponent(websiteId)}/draft`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(restored),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Couldn't restore this checkpoint.");
      setNotice("Checkpoint restored to the saved draft. The website has not been published.");
      window.location.reload();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Couldn't restore this checkpoint.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="version-history-launcher" aria-label="Website version history">
      <div className="version-history-actions">
        <button type="button" onClick={loadVersions} disabled={busy || !websiteId}>{busy ? "Working…" : "Version history"}</button>
        <button type="button" onClick={saveCheckpoint} disabled={busy || !websiteId}>Save checkpoint</button>
      </div>
      {notice && <p role="status" className="editor-notice">{notice}</p>}
      {open && <div className="version-history-panel">
        <div className="version-history-heading"><h2>Saved draft checkpoints</h2><button type="button" onClick={() => setOpen(false)} aria-label="Close version history">×</button></div>
        <p>Checkpoints capture the stored draft, not unsaved editor changes. Restoring updates the draft only and never publishes it.</p>
        {versions.length === 0 ? <p>No checkpoints yet. Save one to create a recovery point.</p> : <ol>{versions.map((version) => <li key={version.id}>
          <div><strong>{version.label}</strong><time dateTime={version.createdAt}>{new Date(version.createdAt).toLocaleString()}</time><p>{version.snapshot.headline}</p></div>
          <button type="button" onClick={() => restoreVersion(version)} disabled={busy}>Restore draft</button>
        </li>)}</ol>}
      </div>}
    </section>
  );
}
