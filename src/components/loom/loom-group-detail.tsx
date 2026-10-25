"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";

type Group = { id: string; name: string; slug: string; description: string; isMember: boolean; memberRole: string | null };
type Post = { id: string; body: string; createdAt: string; authorId: string; authorName: string | null };
type Reply = { id: string; postId: string; body: string; createdAt: string; authorId: string; authorName: string | null };

export function LoomGroupDetail({ groupId }: { groupId: string }) {
  const [group, setGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [body, setBody] = useState("");
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [membershipBusy, setMembershipBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [openReplies, setOpenReplies] = useState<Record<string, boolean>>({});
  const [replies, setReplies] = useState<Record<string, Reply[]>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [replyErrors, setReplyErrors] = useState<Record<string, string>>({});
  const [replyBusy, setReplyBusy] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/loom/groups/" + encodeURIComponent(groupId) + "/posts", { cache: "no-store" });
      const payload = await response.json() as { group?: Group; posts?: Post[]; error?: string };
      if (!response.ok || !payload.group || !payload.posts) throw new Error(payload.error || "Group discussion could not be loaded.");
      setGroup(payload.group);
      setPosts(payload.posts);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Group discussion could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    void fetch("/api/loom/verification", { cache: "no-store" }).then(async response => {
      const payload = await response.json() as { verification?: { status?: string } | null };
      if (response.ok) setVerified(payload.verification?.status === "verified");
    }).catch(() => undefined);
  }, []);

  async function toggleMembership() {
    if (!group || membershipBusy) return;
    setMembershipBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/loom/groups/" + encodeURIComponent(group.id) + "/membership", {
        method: group.isMember ? "DELETE" : "POST",
        headers: { Accept: "application/json" },
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Group membership could not be changed.");
      setGroup(current => current ? { ...current, isMember: !current.isMember, memberRole: current.isMember ? null : "member" } : current);
      setNotice(group.isMember ? "You left the group." : "You joined the group.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Group membership could not be changed.");
    } finally {
      setMembershipBusy(false);
    }
  }

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim() || posting || !group?.isMember || !verified) return;
    setPosting(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/loom/groups/" + encodeURIComponent(groupId) + "/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ body }),
      });
      const payload = await response.json() as { post?: Post; error?: string };
      if (!response.ok || !payload.post) throw new Error(payload.error || "Group post could not be saved.");
      setPosts(current => [payload.post!, ...current]);
      setBody("");
      setNotice("Your discussion has been published.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Group post could not be saved.");
    } finally {
      setPosting(false);
    }
  }

  async function toggleReplies(postId: string) {
    const opening = !openReplies[postId];
    setOpenReplies(current => ({ ...current, [postId]: opening }));
    if (!opening || replies[postId]) return;
    try {
      const response = await fetch("/api/loom/posts/" + encodeURIComponent(postId) + "/replies", { cache: "no-store" });
      const payload = await response.json() as { replies?: Reply[]; error?: string };
      if (!response.ok || !payload.replies) throw new Error(payload.error || "Replies could not be loaded.");
      setReplies(current => ({ ...current, [postId]: payload.replies! }));
    } catch (cause) {
      setReplyErrors(current => ({ ...current, [postId]: cause instanceof Error ? cause.message : "Replies could not be loaded." }));
    }
  }

  async function reply(event: FormEvent<HTMLFormElement>, postId: string) {
    event.preventDefault();
    const text = (drafts[postId] || "").trim();
    if (!text || replyBusy[postId] || !verified) return;
    setReplyBusy(current => ({ ...current, [postId]: true }));
    setReplyErrors(current => ({ ...current, [postId]: "" }));
    try {
      const response = await fetch("/api/loom/posts/" + encodeURIComponent(postId) + "/replies", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const payload = await response.json() as { reply?: Reply; error?: string };
      if (!response.ok || !payload.reply) throw new Error(payload.error || "Reply could not be saved.");
      setReplies(current => ({ ...current, [postId]: [...(current[postId] || []), payload.reply!] }));
      setDrafts(current => ({ ...current, [postId]: "" }));
    } catch (cause) {
      setReplyErrors(current => ({ ...current, [postId]: cause instanceof Error ? cause.message : "Reply could not be saved." }));
    } finally {
      setReplyBusy(current => ({ ...current, [postId]: false }));
    }
  }

  return <main className="loom-page"><header className="loom-topbar"><Link className="loom-brand" href="/workspace"><span className="loom-brand-mark">L</span><span>LUCIA <b>LOOM</b></span></Link><nav><Link href="/loom">Feed</Link><Link href="/loom/groups">Groups</Link><span className="loom-nav-active">Group discussion</span></nav><Link className="loom-workspace-link" href="/workspace">Workspace ↗</Link></header>
    <div className="loom-section-layout"><aside className="loom-left-rail"><span className="loom-rail-label">YOUR LOOM</span><Link href="/loom">Community feed</Link><Link href="/loom/discover">Discover</Link><Link className="loom-rail-active" href="/loom/groups">Groups</Link><Link href="/loom/connections">Connections</Link><Link href="/loom/messages">Messages</Link><Link href="/loom/blocks">Blocked members</Link></aside>
      <section className="loom-section-main"><Link href="/loom/groups">← All groups</Link>
        {loading ? <div className="loom-feed-state">Loading group…</div> : group ? <>
          <span className="loom-eyebrow">LOOM COMMUNITY GROUP</span><h1>{group.name}</h1><p className="loom-section-description">{group.description || "A focused space for people building together."}</p><div className="loom-group-detail-meta"><span>loom / {group.slug}</span><span>{group.isMember ? "You are a member" : "Public group"}</span><button type="button" disabled={membershipBusy || (group.memberRole === "owner" && group.isMember) || (!group.isMember && !verified)} onClick={() => void toggleMembership()}>{membershipBusy ? "Updating…" : group.isMember ? group.memberRole === "owner" ? "Group owner" : "Leave group" : !verified ? "Verify to join" : "Join group"}</button></div>
          {group.isMember && verified ? <form className="loom-composer loom-group-composer" onSubmit={publish}><label htmlFor="loom-group-post">Start a group discussion</label><textarea id="loom-group-post" rows={4} maxLength={4000} value={body} onChange={event => setBody(event.target.value)} placeholder={"Share a question or lesson with " + group.name + "…"} required/><div className="loom-composer-bottom"><span>{body.length}/4000 characters</span><button type="submit" disabled={posting || !body.trim()}>{posting ? "Publishing…" : "Publish to group ↗"}</button></div></form> : <p className="loom-privacy-note">{!verified ? "Business verification is required to join and publish in groups." : "Join this group to publish discussions and replies."}</p>}
          {notice && <p className="loom-notice" role="status">{notice}</p>}
          <div className="loom-feed-heading"><h2>Group discussions</h2><span>{posts.length}</span></div>
          {posts.length ? <div className="loom-post-list">{posts.map(post => <article className="loom-post" key={post.id}><div className="loom-post-avatar">{(post.authorName || "L").trim().slice(0,1).toUpperCase()}</div><div className="loom-post-content"><div className="loom-post-meta"><strong>{post.authorName || "LUCIA member"}</strong><span>·</span><time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleString()}</time></div><p>{post.body}</p><div className="loom-post-actions"><button type="button" onClick={() => void toggleReplies(post.id)}>{openReplies[post.id] ? "Hide replies" : "Replies"}</button></div>{openReplies[post.id] && <div className="loom-replies">{replyErrors[post.id] && <p className="loom-error" role="alert">{replyErrors[post.id]}</p>}{(replies[post.id] || []).map(item => <div className="loom-reply" key={item.id}><strong>{item.authorName || "LUCIA member"}</strong><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time><p>{item.body}</p></div>)}{verified && group.isMember ? <form className="loom-reply-form" onSubmit={event => void reply(event, post.id)}><textarea aria-label="Write a reply" rows={2} maxLength={2000} value={drafts[post.id] || ""} onChange={event => setDrafts(current => ({ ...current, [post.id]: event.target.value }))} placeholder="Reply to this group discussion…"/><button type="submit" disabled={replyBusy[post.id] || !(drafts[post.id] || "").trim()}>{replyBusy[post.id] ? "Sending…" : "Reply"}</button></form> : <p className="loom-privacy-note">Join the group and verify your business to reply.</p>}</div>}</div></article>)}</div> : <div className="loom-feed-state loom-empty"><h3>No discussions yet.</h3><p>{group.isMember ? "Start the first useful conversation in this group." : "Join this group to start a discussion."}</p></div>}
        </> : <div className="loom-feed-state loom-empty"><h3>Group unavailable.</h3><p>This group may have been removed or restricted.</p><Link href="/loom/groups">Return to groups ↗</Link></div>}
        {error && <div className="loom-error" role="alert"><span>{error}</span><button type="button" onClick={() => void load()}>Retry</button></div>}
      </section>
    </div>
  </main>;
}
