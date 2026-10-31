"use client";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
type Item = { id: string; ref: string; bytes: number; width: number; height: number; alt: string; status: string };
export function MediaLibrary({ websiteId, accountId, onChange, protectedIds }: { websiteId: string; accountId: string; onChange: (items: { ref: string; label: string }[]) => void; protectedIds: string[] }) {
  const [library, setLibrary] = useState<{ items: Item[]; enabled: boolean; usedBytes: number; quotaBytes: number } | null>(null);
  const [notice, setNotice] = useState("Loading your image library…"), [busy, setBusy] = useState(false);
  const endpoint = `/api/websites/${websiteId}/media`;
  const load = useCallback(async () => {
    const response = await fetch(endpoint, { cache: "no-store", headers: { "x-lucia-workspace-account": accountId } });
    const body = await response.json();
    if (!response.ok) throw Error(body.error || "Image library unavailable.");
    setLibrary(body);
    onChange(body.items.filter((item: Item) => item.status === "ready").map((item: Item) => ({ ref: item.ref, label: "Your image: " + item.alt })));
    return body;
  }, [endpoint, accountId, onChange]);
  useEffect(() => { let active = true; load().then(() => { if (active) setNotice(""); }).catch((error) => { if (active) setNotice(error.message); }); return () => { active = false; }; }, [load]);
  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget;
    setBusy(true); setNotice("Compressing and saving your image…");
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "x-lucia-workspace-account": accountId }, body: new FormData(form) });
      const body = await response.json(); if (!response.ok) throw Error(body.error);
      await load(); form.reset(); setNotice("Image stored. Choose it from a logo or section image selector, then save the website draft.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Upload failed. Please try again."); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    setBusy(true);
    try { const response = await fetch(endpoint + "?id=" + id, { method: "DELETE", headers: { "x-lucia-workspace-account": accountId } }); const body = await response.json(); if (!response.ok) throw Error(body.error); await load(); setNotice("Unreferenced image removed."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Removal failed."); }
    finally { setBusy(false); }
  }
  return <details className="studio-media-library"><summary>Your image library</summary>
    <p role="status" aria-live="polite">{notice}</p>
    {library && <p>{(library.usedBytes / 1_000_000).toFixed(2)} MB used of {(library.quotaBytes / 1_000_000).toFixed(2)} MB. Images are compressed; original files are not retained.</p>}
    {!library?.enabled && <p>Customer uploads are not enabled yet. You can continue with built-in artwork.</p>}
    <form onSubmit={upload} className="composition-controls">
      <label>Customer image (JPEG, PNG or WebP, up to 4 MB)<input name="file" type="file" accept="image/jpeg,image/png,image/webp" required disabled={busy || !library?.enabled} /></label>
      <label>Describe the image<input name="alt" maxLength={200} required disabled={busy || !library?.enabled} /></label>
      <button disabled={busy || !library?.enabled}>Upload and compress</button>
      <button type="button" disabled={busy} onClick={() => { load().then(() => setNotice("Library refreshed.")).catch((error) => setNotice(error.message)); }}>Refresh library</button>
    </form>
    <ul>{library?.items.map((item) => <li key={item.id}>
      {item.status === "ready" && <Image unoptimized src={"/_media/" + item.id} alt={item.alt} width={120} height={80} style={{ objectFit: "contain" }} />}
      {protectedIds.includes(item.id) && <span>In use in this editor. Save a replacement before removing this image.</span>}
      <span>{item.alt} · {Math.ceil(item.bytes / 1000)} KB · {item.status}</span>
      {item.status === "ready" || item.status === "deleting" || item.status === "pending" ? <button type="button" disabled={busy || protectedIds.includes(item.id)} onClick={() => remove(item.id)}>Remove unused image</button> : <span>Awaiting storage reconciliation; reserved space remains counted.</span>}
    </li>)}</ul>
  </details>;
}
