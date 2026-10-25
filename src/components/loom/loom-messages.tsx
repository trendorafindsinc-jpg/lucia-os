"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";

type Connection = { id: string; requesterUserId: string; recipientUserId: string; status: string; direction: "incoming" | "outgoing"; otherUserName: string | null };
type Message = { id: string; senderUserId: string; recipientUserId: string; body: string; readAt: string | null; createdAt: string };

export function LoomMessages() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedPeer, setSelectedPeer] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadConnections = useCallback(async () => {
    setLoadingConnections(true); setError("");
    try {
      const response = await fetch("/api/loom/connections", { cache: "no-store" });
      const payload = await response.json() as { connections?: Connection[]; error?: string };
      if (!response.ok || !payload.connections) throw new Error(payload.error || "Connections could not be loaded.");
      const accepted = payload.connections.filter(item => item.status === "accepted");
      setConnections(accepted);
      setSelectedPeer(current => current && accepted.some(item => (item.direction === "incoming" ? item.requesterUserId : item.recipientUserId) === current) ? current : (accepted[0] ? (accepted[0].direction === "incoming" ? accepted[0].requesterUserId : accepted[0].recipientUserId) : ""));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Connections could not be loaded.");
    } finally {
      setLoadingConnections(false);
    }
  }, []);

  const loadMessages = useCallback(async (peerId: string) => {
    if (!peerId) { setMessages([]); return; }
    setLoadingMessages(true); setError("");
    try {
      const response = await fetch("/api/loom/messages?with=" + encodeURIComponent(peerId), { cache: "no-store" });
      const payload = await response.json() as { messages?: Message[]; error?: string };
      if (!response.ok || !payload.messages) throw new Error(payload.error || "Messages could not be loaded.");
      setMessages(payload.messages);
    } catch (cause) {
      setMessages([]);
      setError(cause instanceof Error ? cause.message : "Messages could not be loaded.");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => { void loadConnections(); }, [loadConnections]);
  useEffect(() => { void loadMessages(selectedPeer); }, [selectedPeer, loadMessages]);

  const selected = connections.find(item => (item.direction === "incoming" ? item.requesterUserId : item.recipientUserId) === selectedPeer);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !selectedPeer || sending) return;
    setSending(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/loom/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ recipientUserId: selectedPeer, body }),
      });
      const payload = await response.json() as { message?: Message; error?: string };
      if (!response.ok || !payload.message) throw new Error(payload.error || "Message could not be sent.");
      setMessages(current => [...current, payload.message!]);
      setDraft("");
      setNotice("Message sent.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Message could not be sent.");
    } finally {
      setSending(false);
    }
  }

  return <main className="loom-page">
    <header className="loom-topbar"><Link className="loom-brand" href="/workspace"><span className="loom-brand-mark">L</span><span>LUCIA <b>LOOM</b></span></Link><nav><Link href="/loom">Feed</Link><Link href="/loom/connections">Connections</Link><span className="loom-nav-active">Messages</span></nav><Link className="loom-workspace-link" href="/workspace">Workspace ↗</Link></header>
    <div className="loom-section-layout"><aside className="loom-left-rail"><span className="loom-rail-label">YOUR LOOM</span><Link href="/loom">Community feed</Link><Link href="/loom/discover">Discover</Link><Link href="/loom/connections">Connections</Link><Link className="loom-rail-active" href="/loom/messages">Messages</Link><Link href="/loom/notifications">Notifications</Link><Link href="/loom/blocks">Blocked members</Link></aside>
      <section className="loom-section-main"><span className="loom-eyebrow">PRIVATE CONVERSATIONS</span><h1>Messages</h1><p className="loom-section-description">Have focused conversations with verified members you are connected to. Only the two participants can access a conversation.</p>
        {error && <div className="loom-error" role="alert"><span>{error}</span><button type="button" onClick={() => selectedPeer ? void loadMessages(selectedPeer) : void loadConnections()}>Retry</button></div>}
        {loadingConnections ? <div className="loom-feed-state">Loading your connections…</div> : !connections.length ? <div className="loom-feed-state loom-empty"><h3>Your conversations start with a connection.</h3><p>Once a verified business connection is accepted, you can message privately here.</p><Link href="/loom/connections">Manage connections ↗</Link><span> · </span><Link href="/loom/discover">Discover members ↗</Link></div> : <div className="loom-messages-layout">
          <aside className="loom-conversation-list"><h2>Conversations</h2>{connections.map(item => { const peer = item.direction === "incoming" ? item.requesterUserId : item.recipientUserId; return <button key={item.id} type="button" className={selectedPeer === peer ? "loom-conversation-active" : ""} onClick={() => setSelectedPeer(peer)}><span className="loom-post-avatar">{(item.otherUserName || "L").trim().slice(0,1).toUpperCase()}</span><span>{item.otherUserName || "LUCIA member"}</span></button>; })}</aside>
          <section className="loom-message-thread" aria-label="Selected conversation"><header><strong>{selected?.otherUserName || "Choose a connection"}</strong><span>Private conversation</span></header>
            <div className="loom-message-history" aria-live="polite">{loadingMessages ? <div className="loom-feed-state">Loading conversation…</div> : messages.length ? messages.map(message => <article key={message.id} className={"loom-message-bubble" + (message.senderUserId === selectedPeer ? "" : " loom-message-own")}><p>{message.body}</p><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString()}</time></article>) : <div className="loom-feed-state loom-empty"><h3>No messages yet.</h3><p>Start the conversation with a useful question or a thoughtful introduction.</p></div>}</div>
            <form className="loom-message-composer" onSubmit={send}><label className="loom-sr-only" htmlFor="loom-message-draft">Write a private message</label><textarea id="loom-message-draft" rows={3} maxLength={4000} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Write a message…" disabled={!selectedPeer || sending} required/><div><span>{draft.length}/4000</span><button type="submit" disabled={!selectedPeer || sending || !draft.trim()}>{sending ? "Sending…" : "Send message ↗"}</button></div></form>
          </section>
        </div>}
        {notice && <p className="loom-notice" role="status">{notice}</p>}
      </section>
    </div>
  </main>;
}
