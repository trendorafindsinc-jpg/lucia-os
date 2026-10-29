"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type BlockedMember = { id: string; userId: string; displayName: string | null; createdAt: string };

export function LoomBlocks() {
  const [blocks, setBlocks] = useState<BlockedMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/loom/blocks", { cache: "no-store" });
      const payload = await response.json() as { blocks?: BlockedMember[]; error?: string };
      if (!response.ok || !payload.blocks) throw new Error(payload.error || "Blocked members could not be loaded.");
      setBlocks(payload.blocks);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Blocked members could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function unblock(member: BlockedMember) {
    setBusyId(member.userId); setError(""); setNotice("");
    try {
      const response = await fetch("/api/loom/blocks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ userId: member.userId }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Member could not be unblocked.");
      setBlocks(current => current.filter(item => item.userId !== member.userId));
      setNotice((member.displayName || "Member") + " has been unblocked. You can reconnect if both sides are eligible.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Member could not be unblocked.");
    } finally {
      setBusyId("");
    }
  }

  return <main className="loom-page"><header className="loom-topbar"><Link className="loom-brand" href="/workspace"><span className="loom-brand-mark">L</span><span>LUCIA <b>LOOM</b></span></Link><nav><Link href="/loom">Feed</Link><Link href="/loom/discover">Discover</Link><span className="loom-nav-active">Blocked members</span></nav><Link className="loom-workspace-link" href="/workspace">Workspace ↗</Link></header>
    <div className="loom-section-layout"><aside className="loom-left-rail"><span className="loom-rail-label">YOUR LOOM</span><Link href="/loom">Community feed</Link><Link href="/loom/discover">Discover</Link><Link href="/loom/connections">Connections</Link><Link href="/loom/messages">Messages</Link><Link className="loom-rail-active" href="/loom/blocks">Blocked members</Link></aside>
      <section className="loom-section-main"><span className="loom-eyebrow">YOUR BOUNDARIES</span><h1>Blocked members</h1><p className="loom-section-description">Manage who you do not want to connect with. Blocking removes existing connection access and prevents new connections and private messages in either direction.</p>
        {error && <div className="loom-error" role="alert"><span>{error}</span><button type="button" onClick={() => void load()}>Retry</button></div>}
        {notice && <p className="loom-notice" role="status">{notice}</p>}
        {loading ? <div className="loom-feed-state">Loading blocked members…</div> : blocks.length ? <div className="loom-member-list">{blocks.map(member => <article className="loom-member-card" key={member.id}><div className="loom-post-avatar">{(member.displayName || "L").trim().slice(0,1).toUpperCase()}</div><div className="loom-member-info"><h2>{member.displayName || "LUCIA member"}</h2><p>Blocked {new Date(member.createdAt).toLocaleString()}</p><div className="loom-member-actions"><button type="button" disabled={busyId === member.userId} onClick={() => void unblock(member)}>{busyId === member.userId ? "Unblocking…" : "Unblock member"}</button></div></div></article>)}</div> : <div className="loom-feed-state loom-empty"><h3>No blocked members.</h3><p>If you need to set a boundary, you can block a member from Discover.</p><Link href="/loom/discover">Discover members ↗</Link></div>}
      </section>
    </div>
  </main>;
}
