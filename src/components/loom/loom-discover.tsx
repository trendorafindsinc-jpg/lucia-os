"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";

type Member = { userId: string; displayName: string | null; businessName: string | null; bio: string | null; website: string | null };

export function LoomDiscover() {
  const [members, setMembers] = useState<Member[]>([]);
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connectionState, setConnectionState] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState("");
  const [blockBusyId, setBlockBusyId] = useState("");
  const [blockedMembers, setBlockedMembers] = useState<Record<string, string>>({});

  const load = useCallback(async (search = "") => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/loom/members${search ? `?q=${encodeURIComponent(search)}` : ""}`, { cache: "no-store" });
      const payload = await response.json() as { members?: Member[]; error?: string };
      if (!response.ok || !payload.members) throw new Error(payload.error || "Member discovery could not be loaded.");
      setMembers(payload.members);
      setActiveQuery(search);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Member discovery could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function connect(userId: string) {
    setBusyId(userId); setError("");
    try {
      const response = await fetch("/api/loom/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ recipientUserId: userId }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Connection request could not be sent.");
      setConnectionState(current => ({ ...current, [userId]: "Request sent" }));
    } catch (cause) {
      setConnectionState(current => ({ ...current, [userId]: cause instanceof Error ? cause.message : "Request failed" }));
    } finally {
      setBusyId("");
    }
  }

  async function blockMember(userId: string) {
    if (blockBusyId) return;
    setBlockBusyId(userId); setError("");
    try {
      const response = await fetch("/api/loom/blocks", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ userId }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Member could not be blocked.");
      setBlockedMembers(current => ({ ...current, [userId]: "Blocked. Their posts and private interactions are hidden from you." }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Member could not be blocked.");
    } finally {
      setBlockBusyId("");
    }
  }
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load(query.trim());
  }

  return <main className="loom-page"><header className="loom-topbar"><Link className="loom-brand" href="/workspace"><span className="loom-brand-mark">L</span><span>LUCIA <b>LOOM</b></span></Link><nav><Link href="/loom">Feed</Link><span className="loom-nav-active">Discover</span></nav><Link className="loom-workspace-link" href="/workspace">Workspace ↗</Link></header>
    <div className="loom-section-layout"><aside className="loom-left-rail"><span className="loom-rail-label">YOUR LOOM</span><Link href="/loom">Community feed</Link><Link className="loom-rail-active" href="/loom/discover">Discover</Link><Link href="/loom/groups">Groups</Link><Link href="/loom/connections">Connections</Link><Link href="/loom/messages">Messages</Link><Link href="/loom/blocks">Blocked members</Link></aside>
      <section className="loom-section-main"><span className="loom-eyebrow">FIND YOUR PEOPLE</span><h1>Discover businesses</h1><p className="loom-section-description">Find verified members, explore what they do, and connect with people whose work is relevant to yours.</p>
        <form className="loom-search-form" role="search" onSubmit={search}><label className="loom-sr-only" htmlFor="loom-member-search">Search verified businesses</label><input id="loom-member-search" value={query} onChange={event => setQuery(event.target.value)} maxLength={100} placeholder="Search business name, profile, or expertise…" /><button type="submit">Search</button>{activeQuery && <button type="button" onClick={() => { setQuery(""); void load(""); }}>Clear</button>}</form>
        {error && <div className="loom-error" role="alert"><span>{error}</span><button type="button" onClick={() => void load(activeQuery)}>Retry</button></div>}
        {loading ? <div className="loom-feed-state">Finding verified members…</div> : members.length ? <div className="loom-member-list">{members.map(member => <article className="loom-member-card" key={member.userId}><div className="loom-post-avatar">{(member.businessName || member.displayName || "L").trim().slice(0,1).toUpperCase()}</div><div className="loom-member-info"><h2>{member.businessName || member.displayName || "LUCIA member"}</h2>{member.businessName && member.displayName && <p className="loom-member-person">{member.displayName}</p>}<p>{member.bio || "A verified member of the LUCIA business community."}</p>{member.website && /^https?:\/\//i.test(member.website) && <a href={member.website} target="_blank" rel="noreferrer">Visit website ↗</a>}<div className="loom-member-actions"><button type="button" disabled={busyId === member.userId || Boolean(connectionState[member.userId]) || Boolean(blockedMembers[member.userId])} onClick={() => void connect(member.userId)}>{busyId === member.userId ? "Sending…" : connectionState[member.userId] || "Connect"}</button><button type="button" className="loom-block-button" disabled={blockBusyId === member.userId || Boolean(blockedMembers[member.userId])} onClick={() => void blockMember(member.userId)}>{blockBusyId === member.userId ? "Blocking…" : blockedMembers[member.userId] ? "Blocked" : "Block"}</button>{connectionState[member.userId] && <span role="status">{connectionState[member.userId]}</span>}{blockedMembers[member.userId] && <span role="status">{blockedMembers[member.userId]}</span>}</div></div></article>)}</div> : <div className="loom-feed-state loom-empty"><h3>No matching businesses.</h3><p>Try a different search. Verified members with public profiles will appear here.</p></div>}
      </section>
    </div>
  </main>;
}
