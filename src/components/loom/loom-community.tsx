"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";

type Post = { id: string; body: string; createdAt: string; authorId: string; authorName: string | null };
type Reply = { id: string; postId: string; body: string; createdAt: string; authorId: string; authorName: string | null };
type Verification = { evidenceType: string; status: string; reviewNote: string | null; submittedAt: string; reviewedAt: string | null } | null;
type ReactionState = { count: number; reaction: string | null };

export function LoomCommunity() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [body, setBody] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [verification, setVerification] = useState<Verification>(null);
  const [verificationLoaded, setVerificationLoaded] = useState(false);
  const [evidenceType, setEvidenceType] = useState<"registration" | "domain">("registration");
  const [evidenceReference, setEvidenceReference] = useState("");
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [openReplies, setOpenReplies] = useState<Record<string, boolean>>({});
  const [replies, setReplies] = useState<Record<string, Reply[]>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyErrors, setReplyErrors] = useState<Record<string, string>>({});
  const [replyBusy, setReplyBusy] = useState<Record<string, boolean>>({});
  const [reportOpen, setReportOpen] = useState<Record<string, boolean>>({});
  const [reportReasons, setReportReasons] = useState<Record<string, string>>({});
  const [reportDetails, setReportDetails] = useState<Record<string, string>>({});
  const [reportBusy, setReportBusy] = useState<Record<string, boolean>>({});
  const [reportMessages, setReportMessages] = useState<Record<string, string>>({});
  const [savedStatus, setSavedStatus] = useState<Record<string, string>>({});
  const [savingPost, setSavingPost] = useState<Record<string, boolean>>({});
  const [reactionState, setReactionState] = useState<Record<string, ReactionState>>({});
  const [reactionBusy, setReactionBusy] = useState<Record<string, boolean>>({});
  const [reactionErrors, setReactionErrors] = useState<Record<string, string>>({});

  const load = useCallback(async (query = "") => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/loom/posts${query ? `?q=${encodeURIComponent(query)}` : ""}`, { cache: "no-store" });
      const payload = await response.json() as { posts?: Post[]; error?: string };
      if (!response.ok || !payload.posts) throw new Error(payload.error || "The Loom feed could not be loaded.");
      setPosts(payload.posts);
      setActiveSearch(query);
      const reactionResults = await Promise.all(payload.posts.map(async post => {
        try {
          const reactionResponse = await fetch("/api/loom/reactions?postId=" + encodeURIComponent(post.id), { cache: "no-store" });
          const reactionPayload = await reactionResponse.json() as ReactionState;
          if (reactionResponse.ok) return [post.id, { count: reactionPayload.count || 0, reaction: reactionPayload.reaction || null }] as const;
        } catch { /* Feed remains available if reaction counts are unavailable. */ }
        return [post.id, { count: 0, reaction: null }] as const;
      }));
      setReactionState(current => ({ ...current, ...Object.fromEntries(reactionResults) }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The Loom feed could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadVerification = useCallback(async () => {
    try {
      const response = await fetch("/api/loom/verification", { cache: "no-store" });
      if (response.status === 401) {
        setVerification(null);
        return;
      }
      const payload = await response.json() as { verification?: Verification; error?: string };
      if (response.ok) setVerification(payload.verification ?? null);
    } catch {
      // The feed remains readable when verification status cannot be loaded.
    } finally {
      setVerificationLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
    void loadVerification();
  }, [load, loadVerification]);

  async function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (posting || !body.trim()) return;
    setPosting(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/loom/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ body }),
      });
      const payload = await response.json() as { post?: Post; error?: string };
      if (!response.ok || !payload.post) throw new Error(payload.error || "Your post could not be saved.");
      setPosts(current => [payload.post!, ...current]);
      setBody("");
      setNotice("Your post is live in Loom.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your post could not be saved.");
    } finally {
      setPosting(false);
    }
  }

  async function requestVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (verificationBusy || !evidenceReference.trim()) return;
    setVerificationBusy(true);
    setVerificationError("");
    setVerificationMessage("");
    try {
      const response = await fetch("/api/loom/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ evidenceType, evidenceReference }),
      });
      const payload = await response.json() as { status?: string; message?: string; error?: string };
      if (!response.ok) throw new Error(payload.error || "Your verification request could not be submitted.");
      setVerification({ evidenceType, status: payload.status || "pending", reviewNote: null, submittedAt: new Date().toISOString(), reviewedAt: null });
      setVerificationMessage(payload.message || "Request submitted for review.");
      setEvidenceReference("");
    } catch (cause) {
      setVerificationError(cause instanceof Error ? cause.message : "Your verification request could not be submitted.");
    } finally {
      setVerificationBusy(false);
    }
  }

  async function toggleReplies(postId: string) {
    const opening = !openReplies[postId];
    setOpenReplies(current => ({ ...current, [postId]: opening }));
    if (opening && !replies[postId]) {
      setReplyErrors(current => ({ ...current, [postId]: "" }));
      try {
        const response = await fetch(`/api/loom/posts/${postId}/replies`, { cache: "no-store" });
        const payload = await response.json() as { replies?: Reply[]; error?: string };
        if (!response.ok || !payload.replies) throw new Error(payload.error || "Replies could not be loaded.");
        setReplies(current => ({ ...current, [postId]: payload.replies! }));
      } catch (cause) {
        setReplyErrors(current => ({ ...current, [postId]: cause instanceof Error ? cause.message : "Replies could not be loaded." }));
      }
    }
  }

  async function submitReply(event: FormEvent<HTMLFormElement>, postId: string) {
    event.preventDefault();
    const replyBody = (replyDrafts[postId] || "").trim();
    if (!replyBody || replyBusy[postId]) return;
    setReplyBusy(current => ({ ...current, [postId]: true }));
    setReplyErrors(current => ({ ...current, [postId]: "" }));
    try {
      const response = await fetch(`/api/loom/posts/${postId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ body: replyBody }),
      });
      const payload = await response.json() as { reply?: Reply; error?: string };
      if (!response.ok || !payload.reply) throw new Error(payload.error || "Your reply could not be saved.");
      setReplies(current => ({ ...current, [postId]: [...(current[postId] || []), payload.reply!] }));
      setReplyDrafts(current => ({ ...current, [postId]: "" }));
    } catch (cause) {
      setReplyErrors(current => ({ ...current, [postId]: cause instanceof Error ? cause.message : "Your reply could not be saved." }));
    } finally {
      setReplyBusy(current => ({ ...current, [postId]: false }));
    }
  }

  async function toggleReaction(postId: string) {
    if (reactionBusy[postId]) return;
    setReactionBusy(current => ({ ...current, [postId]: true }));
    try {
      const response = await fetch("/api/loom/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ postId, reaction: "like" }),
      });
      const payload = await response.json() as ReactionState & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Reaction could not be saved.");
      setReactionState(current => ({ ...current, [postId]: { count: payload.count, reaction: payload.reaction } }));
      setReactionErrors(current => ({ ...current, [postId]: "" }));
    } catch (cause) {
      setReactionErrors(current => ({ ...current, [postId]: cause instanceof Error ? cause.message : "Reaction could not be saved." }));
    } finally {
      setReactionBusy(current => ({ ...current, [postId]: false }));
    }
  }
  async function savePost(postId: string) {
    if (savingPost[postId]) return;
    setSavingPost(current => ({ ...current, [postId]: true }));
    try {
      const response = await fetch("/api/loom/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ postId }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Post could not be saved.");
      setSavedStatus(current => ({ ...current, [postId]: "Saved for later." }));
    } catch (cause) {
      setSavedStatus(current => ({ ...current, [postId]: cause instanceof Error ? cause.message : "Post could not be saved." }));
    } finally {
      setSavingPost(current => ({ ...current, [postId]: false }));
    }
  }

  async function submitReport(event: FormEvent<HTMLFormElement>, postId: string) {
    event.preventDefault();
    if (reportBusy[postId]) return;
    setReportBusy(current => ({ ...current, [postId]: true }));
    setReplyErrors(current => ({ ...current, [postId]: "" }));
    try {
      const response = await fetch("/api/loom/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ targetType: "post", targetId: postId, reason: reportReasons[postId] || "other", details: reportDetails[postId] || "" }),
      });
      const payload = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(payload.error || "Report could not be submitted.");
      setReportMessages(current => ({ ...current, [postId]: payload.message || "Report submitted." }));
      setReportOpen(current => ({ ...current, [postId]: false }));
      setReportDetails(current => ({ ...current, [postId]: "" }));
    } catch (cause) {
      setReportMessages(current => ({ ...current, [postId]: cause instanceof Error ? cause.message : "Report could not be submitted." }));
    } finally {
      setReportBusy(current => ({ ...current, [postId]: false }));
    }
  }

  const verified = verification?.status === "verified";

  return (
    <main className="loom-page">
      <header className="loom-topbar">
        <Link className="loom-brand" href="/workspace"><span className="loom-brand-mark">L</span><span>LUCIA <b>LOOM</b></span></Link>
        <nav><a className="loom-nav-active" href="#feed">Feed</a><a href="#compose">Start a discussion</a><a href="#verification">Business verification</a><Link href="/loom/discover">Discover</Link></nav>
        <Link className="loom-workspace-link" href="/workspace">Workspace ↗</Link>
      </header>
      <div className="loom-layout">
        <aside className="loom-left-rail">
          <span className="loom-rail-label">YOUR LOOM</span>
          <a className="loom-rail-active" href="#feed">◉ Community feed</a>
          <a href="#compose">＋ New discussion</a>
          <a href="#verification">✓ Business verification</a>
          <Link href="/loom/discussions">Discussions</Link><Link href="/loom/groups">Groups</Link><Link href="/loom/connections">Connections</Link><Link href="/loom/messages">Messages</Link><Link href="/loom/notifications">Notifications</Link><Link href="/loom/saved">Saved posts</Link><Link href="/loom/profile">Your profile</Link>
          <div className="loom-rail-note"><strong>Build in the open.</strong><p>Share useful lessons, ask thoughtful questions, and learn alongside people building their next thing.</p></div>
        </aside>
        <section className="loom-feed-column" id="feed">
          <div className="loom-page-heading"><span className="loom-eyebrow">THE LUCIA COMMUNITY</span><h1>Good work grows<br/><em>when we share it.</em></h1><p>A place for builders, founders and teams to exchange ideas and learn from one another.</p></div>
          <section className="loom-verification-card" id="verification" aria-labelledby="loom-verification-title">
            <span className="loom-eyebrow">PARTICIPATION STATUS</span>
            <h2 id="loom-verification-title">{verified ? "Verified business" : "Read, learn, then contribute"}</h2>
            <p>{verified ? "Your account can publish posts and replies." : "Public discussions are open to read. Publishing and replying require business verification using formal registration or qualifying domain evidence. Requests are reviewed; submitting evidence does not automatically verify a business."}</p>
            {!verificationLoaded ? <p>Loading your verification status…</p> : !verified && verification?.status === "pending" ? <p className="loom-notice" role="status">Verification request pending authorised review.</p> : null}
            {!verified && verificationLoaded && verification?.status !== "pending" ? (
              <form className="loom-verification-form" onSubmit={requestVerification}>
                <label htmlFor="loom-evidence-type">Evidence type</label>
                <select id="loom-evidence-type" value={evidenceType} onChange={event => setEvidenceType(event.target.value as "registration" | "domain")}>
                  <option value="registration">Business registration</option>
                  <option value="domain">Business domain</option>
                </select>
                <label htmlFor="loom-evidence-reference">{evidenceType === "registration" ? "Registration reference or secure evidence location" : "Business domain or secure evidence location"}</label>
                <input id="loom-evidence-reference" value={evidenceReference} onChange={event => setEvidenceReference(event.target.value)} maxLength={500} minLength={3} required placeholder={evidenceType === "registration" ? "Registration number or evidence reference" : "yourbusiness.com"} />
                <button type="submit" disabled={verificationBusy || !evidenceReference.trim()}>{verificationBusy ? "Submitting…" : "Request verification"}</button>
                {verificationError && <p className="loom-error" role="alert">{verificationError}</p>}
                {verificationMessage && <p className="loom-notice" role="status">{verificationMessage}</p>}
              </form>
            ) : null}
            {verification?.status === "rejected" && verification.reviewNote && <p role="status">Review note: {verification.reviewNote}</p>}
            {!verified && <p className="loom-privacy-note">Do not submit passwords or private account credentials. Staff must review evidence before access is granted.</p>}
          </section>
          <form className="loom-composer" id="compose" onSubmit={submitPost}>
            <label htmlFor="loom-post-body">Start a conversation</label>
            <textarea id="loom-post-body" value={body} onChange={event => setBody(event.target.value)} maxLength={4000} placeholder={verified ? "What are you building, learning, or trying to solve?" : "Public reading is available; verification is required to publish."} rows={4} required disabled={!verified} />
            <div className="loom-composer-bottom"><span>{body.length}/4000 characters · {verified ? "Verified business" : "Read-only until verified"}</span><button type="submit" disabled={!verified || posting || !body.trim()}>{posting ? "Publishing…" : "Publish post ↗"}</button></div>
            {notice && <p className="loom-notice" role="status">{notice}</p>}
          </form>
          {error && <div className="loom-error" role="alert"><span>{error}</span><button type="button" onClick={() => void load()}>Retry feed</button></div>}
          <form className="loom-search-form" role="search" onSubmit={event => { event.preventDefault(); void load(searchInput.trim()); }}><label className="loom-sr-only" htmlFor="loom-search">Search public discussions</label><input id="loom-search" value={searchInput} onChange={event => setSearchInput(event.target.value)} maxLength={100} placeholder="Search public discussions…" /><button type="submit">Search</button>{activeSearch && <button type="button" onClick={() => { setSearchInput(""); void load(""); }}>Clear</button>}</form>
          <div className="loom-feed-heading"><h2>{activeSearch ? `Search results for “${activeSearch}”` : "Community conversations"}</h2><span>{activeSearch ? "Matching public posts" : "Latest first"}</span></div>
          {loading ? <div className="loom-feed-state">Loading community posts…</div> : posts.length ? (
            <div className="loom-post-list">{posts.map(post => (
              <article className="loom-post" key={post.id}>
                <div className="loom-post-avatar">{(post.authorName || "L").trim().slice(0, 1).toUpperCase()}</div>
                <div className="loom-post-content">
                  <div className="loom-post-meta"><strong>{post.authorName || "LUCIA member"}</strong><span>·</span><time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleString()}</time></div>
                  <p>{post.body}</p>
                  {reactionErrors[post.id] && <p className="loom-error" role="alert">{reactionErrors[post.id]}</p>}<div className="loom-post-actions"><button type="button" aria-pressed={reactionState[post.id]?.reaction === "like"} className={reactionState[post.id]?.reaction === "like" ? "loom-reacted" : ""} onClick={() => void toggleReaction(post.id)} disabled={reactionBusy[post.id]}>{reactionBusy[post.id] ? "Saving…" : "Like" + (reactionState[post.id] ? " (" + reactionState[post.id].count + ")" : "")}</button><button type="button" onClick={() => void toggleReplies(post.id)}>{openReplies[post.id] ? "Hide replies" : `Replies ${replies[post.id] ? `(${replies[post.id].length})` : ""}`}</button><button type="button" onClick={() => void toggleReplies(post.id)}>Join discussion ↗</button><button type="button" onClick={() => void savePost(post.id)} disabled={savingPost[post.id]}>{savingPost[post.id] ? "Saving…" : "Save post"}</button></div>
                  <button className="loom-report-toggle" type="button" onClick={() => setReportOpen(current => ({ ...current, [post.id]: !current[post.id] }))}>{reportOpen[post.id] ? "Cancel report" : "Report post"}</button>
                  {reportOpen[post.id] && <form className="loom-report-form" onSubmit={event => void submitReport(event, post.id)}>
                    <label htmlFor={`loom-report-reason-${post.id}`}>Reason</label>
                    <select id={`loom-report-reason-${post.id}`} value={reportReasons[post.id] || "other"} onChange={event => setReportReasons(current => ({ ...current, [post.id]: event.target.value }))}><option value="spam">Spam</option><option value="harassment">Harassment</option><option value="misinformation">Misleading information</option><option value="privacy">Privacy concern</option><option value="other">Other</option></select>
                    <label htmlFor={`loom-report-details-${post.id}`}>Details (optional)</label>
                    <textarea id={`loom-report-details-${post.id}`} rows={2} maxLength={1000} value={reportDetails[post.id] || ""} onChange={event => setReportDetails(current => ({ ...current, [post.id]: event.target.value }))} placeholder="Give the review team useful context." />
                    <button type="submit" disabled={reportBusy[post.id]}>{reportBusy[post.id] ? "Submitting…" : "Send report"}</button>
                  </form>}
                  {reportMessages[post.id] && <p className="loom-notice" role="status">{reportMessages[post.id]}</p>}{savedStatus[post.id] && <p className="loom-notice" role="status">{savedStatus[post.id]}</p>}
                  {openReplies[post.id] && <div className="loom-replies">
                    {replyErrors[post.id] && <p className="loom-error" role="alert">{replyErrors[post.id]}</p>}
                    {(replies[post.id] || []).map(reply => <div className="loom-reply" key={reply.id}><strong>{reply.authorName || "LUCIA member"}</strong><time dateTime={reply.createdAt}>{new Date(reply.createdAt).toLocaleString()}</time><p>{reply.body}</p></div>)}
                    {verified ? <form onSubmit={event => void submitReply(event, post.id)} className="loom-reply-form"><textarea aria-label="Write a reply" rows={2} maxLength={2000} required value={replyDrafts[post.id] || ""} onChange={event => setReplyDrafts(current => ({ ...current, [post.id]: event.target.value }))} placeholder="Add a thoughtful reply…"/><button type="submit" disabled={replyBusy[post.id] || !(replyDrafts[post.id] || "").trim()}>{replyBusy[post.id] ? "Sending…" : "Reply"}</button></form> : <p className="loom-privacy-note">Business verification is required to reply.</p>}
                  </div>}
                </div>
              </article>
            ))}</div>
          ) : <div className="loom-feed-state loom-empty"><h3>{activeSearch ? "No matching conversations." : "Start the first conversation."}</h3><p>{activeSearch ? "Try another phrase or clear your search." : "The feed reads saved community posts. Be the first to share a useful question, lesson, or idea."}</p><a href="#compose">Write the first post ↓</a></div>}
        </section>
        <aside className="loom-right-rail">
          <section className="loom-side-card"><span className="loom-eyebrow">COMMUNITY PRINCIPLES</span><h2>Make it useful.</h2><ul><li>Share what you have learned.</li><li>Give context when asking for help.</li><li>Respect people and their work.</li><li>Never post private customer information.</li></ul></section>
          <section className="loom-side-card"><span className="loom-eyebrow">CONNECTED WORK</span><h2>Take ideas into action.</h2><p>Move from community inspiration to your website workspace.</p><Link href="/workspace/websites">Open your websites ↗</Link><Link href="/templates">Explore layouts ↗</Link></section>
          <p className="loom-privacy-note">Posts are public to Loom visitors. Do not share passwords, private customer data, or confidential business information.</p>
        </aside>
      </div>
    </main>
  );
}
