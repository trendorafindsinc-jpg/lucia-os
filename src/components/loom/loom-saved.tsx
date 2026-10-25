"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Saved = { id: string; savedAt: string; postId: string; body: string; postCreatedAt: string; authorId: string; authorName: string | null };

export function LoomSaved() {
  const [items, setItems] = useState<Saved[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/loom/saved", { cache: "no-store" });
      const payload = await response.json() as { saved?: Saved[]; error?: string };
      if (!response.ok || !payload.saved) throw new Error(payload.error || "Saved posts could not be loaded.");
      setItems(payload.saved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Saved posts could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function remove(postId: string) {
    setBusyId(postId); setError("");
    try {
      const response = await fetch("/api/loom/saved", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ postId }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Saved post could not be removed.");
      setItems(current => current.filter(item => item.postId !== postId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Saved post could not be removed.");
    } finally {
      setBusyId("");
    }
  }

  return <main className="loom-page"><header className="loom-topbar"><Link className="loom-brand" href="/workspace"><span className="loom-brand-mark">L</span><span>LUCIA <b>LOOM</b></span></Link><nav><Link href="/loom">Feed</Link><span className="loom-nav-active">Saved posts</span></nav><Link className="loom-workspace-link" href="/workspace">Workspace ↗</Link></header>
    <div className="loom-section-layout"><aside className="loom-left-rail"><span className="loom-rail-label">YOUR LOOM</span><Link href="/loom">Community feed</Link><Link href="/loom/groups">Groups</Link><Link className="loom-rail-active" href="/loom/saved">Saved posts</Link></aside>
      <section className="loom-section-main"><span className="loom-eyebrow">KEEP WHAT MATTERS</span><h1>Saved posts</h1><p className="loom-section-description">A private collection of ideas and advice you want to revisit.</p>
        {error && <div className="loom-error" role="alert"><span>{error}</span><button type="button" onClick={() => void load()}>Retry</button></div>}
        {loading ? <div className="loom-feed-state">Loading saved posts…</div> : items.length ? <div className="loom-saved-list">{items.map(item => <article className="loom-saved-card" key={item.id}><div className="loom-post-meta"><strong>{item.authorName || "LUCIA member"}</strong><span>·</span><time dateTime={item.postCreatedAt}>{new Date(item.postCreatedAt).toLocaleString()}</time></div><p>{item.body}</p><button type="button" disabled={busyId === item.postId} onClick={() => void remove(item.postId)}>{busyId === item.postId ? "Removing…" : "Remove saved post"}</button></article>)}</div> : <div className="loom-feed-state loom-empty"><h3>Nothing saved yet.</h3><p>Save useful public posts from the community feed and they will appear here.</p><Link href="/loom">Explore the feed ↗</Link></div>}
      </section>
    </div>
  </main>;
}
