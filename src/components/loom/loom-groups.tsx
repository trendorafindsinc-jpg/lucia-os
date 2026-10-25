"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";

type Group = { id: string; name: string; slug: string; description: string; createdAt: string };

export function LoomGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/loom/groups", { cache: "no-store" });
      const payload = await response.json() as { groups?: Group[]; error?: string };
      if (!response.ok || !payload.groups) throw new Error(payload.error || "Groups could not be loaded.");
      setGroups(payload.groups);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Groups could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function updateName(value: string) {
    setName(value);
    setSlug(value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80));
  }

  async function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/loom/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name, slug, description }),
      });
      const payload = await response.json() as { group?: Group; error?: string };
      if (!response.ok || !payload.group) throw new Error(payload.error || "Group could not be created.");
      setGroups(current => [payload.group!, ...current]);
      setName("");
      setSlug("");
      setDescription("");
      setNotice("Your group has been created.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Group could not be created.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="loom-page">
      <header className="loom-topbar"><Link className="loom-brand" href="/workspace"><span className="loom-brand-mark">L</span><span>LUCIA <b>LOOM</b></span></Link><nav><Link href="/loom">Feed</Link><span className="loom-nav-active">Groups</span></nav><Link className="loom-workspace-link" href="/workspace">Workspace ↗</Link></header>
      <div className="loom-section-layout">
        <aside className="loom-left-rail"><span className="loom-rail-label">YOUR LOOM</span><Link href="/loom">Community feed</Link><Link href="/loom/discover">Discover</Link><Link className="loom-rail-active" href="/loom/groups">Groups</Link><Link href="/loom/connections">Connections</Link><Link href="/loom/messages">Messages</Link></aside>
        <section className="loom-section-main">
          <span className="loom-eyebrow">BUILD TOGETHER</span><h1>Community groups</h1><p className="loom-section-description">Create focused spaces for people sharing a craft, industry, or business challenge.</p>
          <form className="loom-group-form" onSubmit={createGroup}>
            <h2>Create a group</h2>
            <label htmlFor="loom-group-name">Group name</label><input id="loom-group-name" value={name} onChange={event => updateName(event.target.value)} minLength={2} maxLength={100} required placeholder="e.g. Independent founders" />
            <label htmlFor="loom-group-slug">Unique address</label><input id="loom-group-slug" value={slug} onChange={event => setSlug(event.target.value.toLowerCase())} maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" required placeholder="independent-founders" />
            <label htmlFor="loom-group-description">What is this group for?</label><textarea id="loom-group-description" value={description} onChange={event => setDescription(event.target.value)} maxLength={1000} rows={3} placeholder="Explain the group's purpose and who it helps." />
            <button type="submit" disabled={busy || !name.trim() || !slug.trim()}>{busy ? "Creating…" : "Create group"}</button>
            <p className="loom-privacy-note">Creating groups requires verified business identity. If you are not verified yet, <Link href="/loom#verification">request verification</Link>.</p>
          </form>
          {error && <div className="loom-error" role="alert"><span>{error}</span><button type="button" onClick={() => void load()}>Retry</button></div>}
          {notice && <p className="loom-notice" role="status">{notice}</p>}
          <div className="loom-feed-heading"><h2>Public groups</h2><span>{groups.length}</span></div>
          {loading ? <div className="loom-feed-state">Loading groups…</div> : groups.length ? <div className="loom-group-list">{groups.map(group => <article className="loom-group-card" key={group.id}><span className="loom-group-symbol">L</span><div><h3>{group.name}</h3><p>{group.description || "A public Loom community space."}</p><span className="loom-group-slug">loom / {group.slug}</span></div></article>)}</div> : <div className="loom-feed-state loom-empty"><h3>No groups yet.</h3><p>Create the first group for your business community. Group creation requires verification.</p></div>}
        </section>
      </div>
    </main>
  );
}
