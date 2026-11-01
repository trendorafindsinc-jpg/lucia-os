"use client";

import { StaffNavigation } from "./staff-navigation";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

type CaseRecord = { id: string; subject: string; category: string; priority: string; status: string; createdAt: string; updatedAt: string; assignedStaffUserId?: string | null };
type Message = { id: string; authorKind: string; visibility: string; body: string; createdAt: string };

export function SupportConversation({ caseId, staffMode = false, canReply = true, canResolve = false, canClaim = false }: { caseId: string; staffMode?: boolean; canReply?: boolean; canResolve?: boolean; canClaim?: boolean }) {
  const apiBase = staffMode ? "/api/staff/support/cases" : "/api/support/cases";
  const backHref = staffMode ? "/staff/support" : "/support";
  const [internal, setInternal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [record, setRecord] = useState<CaseRecord | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [caseResponse, messageResponse] = await Promise.all([
        fetch(`${apiBase}/${encodeURIComponent(caseId)}`, { cache: "no-store" }),
        fetch(`${apiBase}/${encodeURIComponent(caseId)}/messages`, { cache: "no-store" }),
      ]);
      const caseData = await caseResponse.json();
      const messageData = await messageResponse.json();
      if (!caseResponse.ok) throw new Error(caseData.error || "Couldn't open this support case.");
      if (!messageResponse.ok) throw new Error(messageData.error || "Couldn't load the conversation.");
      setRecord(caseData.case);
      setMessages(messageData.messages ?? []);
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn't load this support case."); }
    finally { setLoading(false); }
  }, [apiBase, caseId]);

  useEffect(() => { void load(); }, [load]);

  async function reply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSending(true); setError(""); setNotice("");
    try {
      const response = await fetch(`${apiBase}/${encodeURIComponent(caseId)}/messages${staffMode && internal ? "?visibility=internal" : ""}`, {
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

  async function updateStatus(status: string, claim = false) {
    setUpdating(true); setError(""); setNotice("");
    try {
      const response = await fetch(`${apiBase}/${encodeURIComponent(caseId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(claim ? { action: "claim" } : { action: "status", status }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Couldn't update this case.");
      await load(); setNotice("Case status saved.");
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn't update this case."); }
    finally { setUpdating(false); }
  }

  return <main className="workspace-shell"><header className="workspace-topbar"><Link className="workspace-brand" href={staffMode ? "/staff" : "/workspace"}><span className="workspace-brand-mark" aria-hidden="true"><i /></span><span>LUCIA <span className="workspace-brand-muted">OS</span></span></Link><div className="workspace-topbar-right"><span className="workspace-context">Support conversation</span><span className="workspace-avatar">◎</span></div></header>
    <div className="workspace-layout">{staffMode ? <StaffNavigation active="support" /> : <aside className="workspace-sidebar"><span className="workspace-sidebar-label">YOUR WORKSPACE</span><Link className="workspace-nav-item" href="/workspace"><span>▦</span> Overview</Link><Link className="workspace-nav-item" href="/workspace/websites"><span>◇</span> Websites</Link><Link className="workspace-nav-item" href="/workspace/team"><span>♙</span> Team &amp; access</Link><Link className="workspace-nav-item" href="/billing"><span>◷</span> Billing</Link><Link className="workspace-nav-item workspace-nav-active" href={backHref}><span>◎</span> Help &amp; support</Link><div className="workspace-sidebar-bottom"><span className="workspace-status-dot" /> Secure support</div></aside>}
      <section className="workspace-main"><Link className="workspace-back" href={backHref}>← All support cases</Link>
        {loading && !record ? <section className="workspace-panel"><div className="workspace-empty"><h3>Opening your conversation…</h3><p>Checking your organisation access and retrieving messages.</p></div></section> : record ? <><div className="workspace-heading lucia-case-heading"><div><span className="workspace-kicker">SUPPORT CASE · {record.id.slice(0,8).toUpperCase()}</span><h1>{record.subject}</h1><p>{record.category.replaceAll("_"," ")} · Created {new Date(record.createdAt).toLocaleDateString()}</p></div><span className={`workspace-status ${["resolved","closed"].includes(record.status) ? "workspace-status-success" : "workspace-status-neutral"}`}>{record.status.replaceAll("_"," ")}</span></div>
          {staffMode && canClaim ? <section className="workspace-panel"><div className="workspace-panel-heading"><div><h2>Case ownership</h2><p>{record.assignedStaffUserId ? "Assigned to a staff member" : "Unassigned"}</p></div><button type="button" className="workspace-button workspace-button-secondary" disabled={updating || loading} onClick={() => void updateStatus(record.status, true)}>Assign to me</button></div></section> : null}
          {staffMode && canResolve ? <section className="workspace-panel"><label className="lucia-support-actions">Case status<select aria-label="Case status" value={record.status} disabled={updating || loading} onChange={event => void updateStatus(event.target.value)}>{["open", "in_progress", "waiting_on_customer", "waiting_on_staff", "resolved", "closed"].map(status => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label></section> : null}
          <section className="workspace-panel"><div className="workspace-panel-heading"><div><h2>Conversation</h2><p>Messages visible to your organisation and the LUCIA support team.</p></div><button className="workspace-button workspace-button-secondary" style={{marginTop:0}} type="button" onClick={() => void load()} disabled={loading}>Refresh</button></div>
            <div className="lucia-message-list">{messages.length ? messages.map((message) => <article className={`lucia-message ${message.authorKind === "staff" ? "lucia-message-staff" : "lucia-message-customer"}`} key={message.id}><div className="lucia-message-meta"><strong>{message.visibility === "internal" ? "Internal note · " : ""}{message.authorKind === "staff" ? "LUCIA Support" : staffMode ? "Customer organisation" : "Your organisation"}</strong><span>{new Date(message.createdAt).toLocaleString()}</span></div><p>{message.body}</p></article>) : <div className="workspace-empty"><span className="workspace-empty-icon">◎</span><h3>Start the conversation</h3><p>Send a message with any additional details that may help resolve your request.</p></div>}</div>
            {!canReply ? <p className="lucia-case-closed">Your staff role allows reading this case.</p> : record.status === "closed" || record.status === "resolved" ? <p className="lucia-case-closed">This case is {record.status}. Replies are disabled until the support team reopens it.</p> : <form className="lucia-reply-form" onSubmit={reply}>{staffMode ? <label><input type="checkbox" checked={internal} onChange={event => setInternal(event.target.checked)} /> Internal note — visible only to staff</label> : null}<label htmlFor="support-reply">{internal ? "Internal note" : "Your reply"}</label><textarea id="support-reply" value={body} onChange={(event) => setBody(event.target.value)} maxLength={12000} rows={4} required placeholder="Add details or reply to the support team…" /><div><span>{body.length}/12,000 characters</span><button className="workspace-button workspace-button-primary" type="submit" disabled={sending || !body.trim()}>{sending ? "Sending…" : "Send reply"}</button></div></form>}
            {notice ? <p className="lucia-support-message" role="status">{notice}</p> : null}
          </section></> : <section className="workspace-panel"><div className="workspace-empty"><h3>We couldn&apos;t open this case</h3><p>It may not exist, or your LUCIA ID may not have access to the organisation that owns it.</p><Link className="workspace-button workspace-button-secondary" href={backHref}>Return to support</Link></div></section>}
        {error ? <p className="lucia-support-error" role="alert">{error}</p> : null}
      </section>
    </div>
  </main>;
}
