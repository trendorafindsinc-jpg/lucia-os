"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

type CaseRecord = { id: string; subject: string; category: string; priority: string; status: string; createdAt: string; updatedAt: string };
type Message = { id: string; authorKind: string; visibility: string; body: string; createdAt: string };

export function SupportConversation({ caseId }: { caseId: string }) {
  const [record, setRecord] = useState<CaseRecord | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const [caseResponse, messageResponse] = await Promise.all([
        fetch(`/api/support/cases/${encodeURIComponent(caseId)}`, { cache: "no-store" }),
        fetch(`/api/support/cases/${encodeURIComponent(caseId)}/messages`, { cache: "no-store" }),
      ]);
      const caseData = await caseResponse.json();
      const messageData = await messageResponse.json();
      if (!caseResponse.ok) throw new Error(caseData.error || "Couldn't open this support case.");
      if (!messageResponse.ok) throw new Error(messageData.error || "Couldn't load the conversation.");
      setRecord(caseData.case);
      setMessages(messageData.messages ?? []);
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn't load this support case."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [caseId]);

  async function reply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSending(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/support/cases/${encodeURIComponent(caseId)}/messages`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Couldn't send your reply.");
      setMessages((current) => [...current, data.message]);
      setBody(""); setNotice("Reply saved.");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn't send your reply."); }
    finally { setSending(false); }
  }

  return <main className="workspace-shell"><header className="workspace-topbar"><Link className="workspace-brand" href="/"><span className="workspace-brand-mark" aria-hidden="true"><i /></span><span>LUCIA <span className="workspace-brand-muted">OS</span></span></Link><div className="workspace-topbar-right"><span className="workspace-context">Support conversation</span><span className="workspace-avatar">◎</span></div></header>
    <div className="workspace-layout"><aside className="workspace-sidebar"><span className="workspace-sidebar-label">YOUR WORKSPACE</span><Link className="workspace-nav-item" href="/workspace"><span>▦</span> Overview</Link><Link className="workspace-nav-item" href="/workspace/websites"><span>◇</span> Websites</Link><Link className="workspace-nav-item" href="/workspace/team"><span>♙</span> Team &amp; access</Link><Link className="workspace-nav-item" href="/billing"><span>◷</span> Billing</Link><Link className="workspace-nav-item workspace-nav-active" href="/support"><span>◎</span> Help &amp; support</Link><div className="workspace-sidebar-bottom"><span className="workspace-status-dot" /> Secure support</div></aside>
      <section className="workspace-main"><Link className="workspace-back" href="/support">← All support cases</Link>
        {loading && !record ? <section className="workspace-panel"><div className="workspace-empty"><h3>Opening your conversation…</h3><p>Checking your organisation access and retrieving messages.</p></div></section> : record ? <><div className="workspace-heading lucia-case-heading"><div><span className="workspace-kicker">SUPPORT CASE · {record.id.slice(0,8).toUpperCase()}</span><h1>{record.subject}</h1><p>{record.category.replaceAll("_"," ")} · Created {new Date(record.createdAt).toLocaleDateString()}</p></div><span className={`workspace-status ${["resolved","closed"].includes(record.status) ? "workspace-status-success" : "workspace-status-neutral"}`}>{record.status.replaceAll("_"," ")}</span></div>
          <section className="workspace-panel"><div className="workspace-panel-heading"><div><h2>Conversation</h2><p>Messages visible to your organisation and the LUCIA support team.</p></div><button className="workspace-button workspace-button-secondary" style={{marginTop:0}} type="button" onClick={() => void load()} disabled={loading}>Refresh</button></div>
            <div className="lucia-message-list">{messages.length ? messages.map((message) => <article className={`lucia-message ${message.authorKind === "staff" ? "lucia-message-staff" : "lucia-message-customer"}`} key={message.id}><div className="lucia-message-meta"><strong>{message.authorKind === "staff" ? "LUCIA Support" : "Your organisation"}</strong><span>{new Date(message.createdAt).toLocaleString()}</span></div><p>{message.body}</p></article>) : <div className="workspace-empty"><span className="workspace-empty-icon">◎</span><h3>Start the conversation</h3><p>Send a message with any additional details that may help resolve your request.</p></div>}</div>
            {record.status === "closed" || record.status === "resolved" ? <p className="lucia-case-closed">This case is {record.status}. Replies are disabled until the support team reopens it.</p> : <form className="lucia-reply-form" onSubmit={reply}><label htmlFor="support-reply">Your reply</label><textarea id="support-reply" value={body} onChange={(event) => setBody(event.target.value)} maxLength={12000} rows={4} required placeholder="Add details or reply to the support team…" /><div><span>{body.length}/12,000 characters</span><button className="workspace-button workspace-button-primary" type="submit" disabled={sending || !body.trim()}>{sending ? "Sending…" : "Send reply"}</button></div></form>}
            {notice ? <p className="lucia-support-message" role="status">{notice}</p> : null}
          </section></> : <section className="workspace-panel"><div className="workspace-empty"><h3>We couldn't open this case</h3><p>It may not exist, or your LUCIA ID may not have access to the organisation that owns it.</p><Link className="workspace-button workspace-button-secondary" href="/support">Return to support</Link></div></section>}
        {error ? <p className="lucia-support-error" role="alert">{error}</p> : null}
      </section>
    </div>
  </main>;
}
