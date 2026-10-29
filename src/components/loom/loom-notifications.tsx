"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Notification = { id: string; actorUserId: string | null; kind: string; targetId: string | null; body: string; readAt: string | null; createdAt: string };

export function LoomNotifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/loom/notifications", { cache: "no-store" });
      const payload = await response.json() as { notifications?: Notification[]; error?: string };
      if (!response.ok || !payload.notifications) throw new Error(payload.error || "Notifications could not be loaded.");
      setItems(payload.notifications);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Notifications could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function markRead(id?: string) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/loom/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(id ? { id } : { markAllRead: true }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Notification status could not be updated.");
      const now = new Date().toISOString();
      setItems(current => current.map(item => (!id || item.id === id) ? { ...item, readAt: item.readAt || now } : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Notification status could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  const unread = items.filter(item => !item.readAt).length;

  return <main className="loom-page"><header className="loom-topbar"><Link className="loom-brand" href="/workspace"><span className="loom-brand-mark">L</span><span>LUCIA <b>LOOM</b></span></Link><nav><Link href="/loom">Feed</Link><span className="loom-nav-active">Notifications</span></nav><Link className="loom-workspace-link" href="/workspace">Workspace ↗</Link></header>
    <div className="loom-section-layout"><aside className="loom-left-rail"><span className="loom-rail-label">YOUR LOOM</span><Link href="/loom">Community feed</Link><Link href="/loom/connections">Connections</Link><Link className="loom-rail-active" href="/loom/notifications">Notifications</Link></aside>
      <section className="loom-section-main"><span className="loom-eyebrow">WHAT NEEDS YOUR ATTENTION</span><h1>Notifications</h1><p className="loom-section-description">Connection requests, replies, and other community activity.</p>
        <div className="loom-notification-toolbar"><span>{unread} unread</span><button type="button" onClick={() => void markRead()} disabled={busy || unread === 0}>{busy ? "Updating…" : "Mark all as read"}</button></div>
        {error && <div className="loom-error" role="alert"><span>{error}</span><button type="button" onClick={() => void load()}>Retry</button></div>}
        {loading ? <div className="loom-feed-state">Loading notifications…</div> : items.length ? <div className="loom-notification-list">{items.map(item => <article className={item.readAt ? "loom-notification-item" : "loom-notification-item loom-notification-unread"} key={item.id}><span className="loom-notification-dot" aria-hidden="true"/><div><p>{item.body}</p><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time></div>{!item.readAt && <button type="button" disabled={busy} onClick={() => void markRead(item.id)}>Mark read</button>}</article>)}</div> : <div className="loom-feed-state loom-empty"><h3>You are all caught up.</h3><p>Community activity will appear here when someone replies or connects with you.</p><Link href="/loom">Return to the feed ↗</Link></div>}
      </section>
    </div>
  </main>;
}
