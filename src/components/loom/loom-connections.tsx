"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Connection = { id: string; requesterUserId: string; recipientUserId: string; status: string; createdAt: string; direction: "incoming" | "outgoing"; otherUserName: string | null };

export function LoomConnections() {
  const [items, setItems] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/loom/connections", { cache: "no-store" });
      const payload = await response.json() as { connections?: Connection[]; error?: string };
      if (!response.ok || !payload.connections) throw new Error(payload.error || "Connections could not be loaded.");
      setItems(payload.connections);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Connections could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function respond(connectionId: string, action: "accept" | "decline") {
    setBusyId(connectionId); setError("");
    try {
      const response = await fetch("/api/loom/connections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ connectionId, action }),
      });
      const payload = await response.json() as { connection?: { status: string }; error?: string };
      if (!response.ok || !payload.connection) throw new Error(payload.error || "Connection request could not be updated.");
      setItems(current => current.map(item => item.id === connectionId ? { ...item, status: payload.connection!.status } : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Connection request could not be updated.");
    } finally {
      setBusyId("");
    }
  }

  return <main className="loom-page"><header className="loom-topbar"><Link className="loom-brand" href="/workspace"><span className="loom-brand-mark">L</span><span>LUCIA <b>LOOM</b></span></Link><nav><Link href="/loom">Feed</Link><span className="loom-nav-active">Connections</span></nav><Link className="loom-workspace-link" href="/workspace">Workspace ↗</Link></header>
    <div className="loom-section-layout"><aside className="loom-left-rail"><span className="loom-rail-label">YOUR LOOM</span><Link href="/loom">Community feed</Link><Link href="/loom/discover">Discover</Link><Link className="loom-rail-active" href="/loom/connections">Connections</Link><Link href="/loom/messages">Messages</Link></aside>
      <section className="loom-section-main"><span className="loom-eyebrow">YOUR NETWORK</span><h1>Connections</h1><p className="loom-section-description">Manage professional connection requests and build trusted relationships.</p><p><Link href="/loom/discover">Discover verified businesses ↗</Link></p>
        {error && <div className="loom-error" role="alert"><span>{error}</span><button type="button" onClick={() => void load()}>Retry</button></div>}
        {loading ? <div className="loom-feed-state">Loading connections…</div> : items.length ? <div className="loom-connection-list">{items.map(item => <article className="loom-connection-card" key={item.id}><div className="loom-post-avatar">{(item.otherUserName || "L").trim().slice(0,1).toUpperCase()}</div><div className="loom-connection-info"><h2>{item.otherUserName || "LUCIA member"}</h2><p>{item.direction === "incoming" ? "Sent you a connection request" : "Connection request sent by you"}</p><span className="loom-connection-status">{item.status.replaceAll("_", " ")}</span></div>{item.direction === "incoming" && item.status === "pending" && <div className="loom-connection-actions"><button type="button" disabled={busyId === item.id} onClick={() => void respond(item.id, "accept")}>Accept</button><button type="button" disabled={busyId === item.id} onClick={() => void respond(item.id, "decline")}>Decline</button></div>}</article>)}</div> : <div className="loom-feed-state loom-empty"><h3>Your network starts here.</h3><p>Discover verified businesses and send a connection request to start building your network.</p><Link href="/loom/discover">Discover members ↗</Link></div>}
      </section>
    </div>
  </main>;
}
