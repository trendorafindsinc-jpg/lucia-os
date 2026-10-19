"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Organisation = { id: string; name: string; role: string };
type SupportCase = { id: string; subject: string; category: string; priority: string; status: string; createdAt: string; updatedAt?: string };

export function SupportWorkspace({ organisations }: { organisations: Organisation[] }) {
  const [organisationId, setOrganisationId] = useState(organisations[0]?.id ?? "");
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("normal");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadCases(orgId: string) {
    if (!orgId) { setCases([]); return; }
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/support/cases?organizationId=${encodeURIComponent(orgId)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Couldn't load support cases.");
      setCases(data.cases ?? []);
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn't load support cases."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void loadCases(organisationId); }, [organisationId]);

  async function submitCase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/support/cases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organizationId: organisationId, subject, category, priority }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Couldn't open your support case.");
      setSubject(""); setMessage("Your support request is saved. The LUCIA team can now review it.");
      await loadCases(organisationId);
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn't open your support case."); }
    finally { setSaving(false); }
  }

  return <main className="workspace-shell">
    <header className="workspace-topbar"><Link className="workspace-brand" href="/"><span className="workspace-brand-mark" aria-hidden="true"><i /></span><span>LUCIA <span className="workspace-brand-muted">OS</span></span></Link><div className="workspace-topbar-right"><span className="workspace-context">Help &amp; support</span><span className="workspace-avatar">?</span></div></header>
    <div className="workspace-layout"><aside className="workspace-sidebar"><span className="workspace-sidebar-label">YOUR WORKSPACE</span><Link className="workspace-nav-item" href="/workspace"><span>▦</span> Overview</Link><Link className="workspace-nav-item" href="/workspace/websites"><span>◇</span> Websites</Link><Link className="workspace-nav-item" href="/workspace/team"><span>♙</span> Team &amp; access</Link><Link className="workspace-nav-item" href="/billing"><span>◷</span> Billing</Link><Link className="workspace-nav-item workspace-nav-active" href="/support"><span>◎</span> Help &amp; support</Link><div className="workspace-sidebar-bottom"><span className="workspace-status-dot" /> Secure support</div></aside>
      <section className="workspace-main"><div className="workspace-heading"><div><span className="workspace-kicker">WE’RE HERE TO HELP</span><h1>Let’s solve it together.</h1><p>Open a request and follow the support cases linked to your organisation.</p></div><span className="workspace-live-pill"><span /> Connected to workspace data</span></div>
        {organisations.length ? <><section className="workspace-panel"><div className="workspace-panel-heading"><div><h2>Contact LUCIA support</h2><p>Your request will be attached to the selected organisation.</p></div></div><form className="lucia-support-form" onSubmit={submitCase}><label>Organisation<select value={organisationId} onChange={(event) => setOrganisationId(event.target.value)}>{organisations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label><label>What do you need help with?<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="general">General question</option><option value="account">Account &amp; sign-in</option><option value="website">Website setup</option><option value="publishing">Publishing &amp; domains</option><option value="billing">Billing</option><option value="security">Security</option><option value="other">Something else</option></select></label><label>How urgent is it?<select value={priority} onChange={(event) => setPriority(event.target.value)}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label><label>Subject<input value={subject} onChange={(event) => setSubject(event.target.value)} minLength={3} maxLength={180} required placeholder="Briefly describe the issue" /></label><div className="lucia-support-actions"><button className="workspace-button workspace-button-primary" type="submit" disabled={saving || !organisationId}>{saving ? "Sending request…" : "Open support request"}</button><button className="workspace-button workspace-button-secondary" type="button" onClick={() => void loadCases(organisationId)} disabled={loading}>Refresh cases</button></div></form>{message ? <p className="lucia-support-message" role="status">{message}</p> : null}{error ? <p className="lucia-support-error" role="alert">{error}</p> : null}</section>
          <section className="workspace-panel lucia-support-cases"><div className="workspace-panel-heading"><div><h2>Your support cases</h2><p>Cases for the selected organisation, newest updates first.</p></div><span className="workspace-count">{loading ? "Loading…" : cases.length + " cases"}</span></div>{cases.length ? <div className="workspace-org-list">{cases.map((item) => <article className="workspace-org-card" key={item.id}><div className="workspace-org-avatar">◎</div><div className="workspace-org-info"><h3>{item.subject}</h3><p>{item.category.replaceAll("_"," ")} · Opened {new Date(item.createdAt).toLocaleDateString()}</p></div><span className={`workspace-status ${["resolved","closed"].includes(item.status) ? "workspace-status-success" : "workspace-status-neutral"}`}>{item.status.replaceAll("_"," ")}</span></article>)}</div> : <div className="workspace-empty"><span className="workspace-empty-icon">◎</span><h3>{loading ? "Loading your cases" : "Nothing in your queue yet"}</h3><p>{loading ? "Your latest support cases are being retrieved." : "When you open a request, it will appear here."}</p></div>}</section></> : <section className="workspace-panel"><div className="workspace-empty"><h3>An organisation is needed</h3><p>Create a workspace or accept an organisation invitation before opening a support request.</p><Link className="workspace-button workspace-button-secondary" href="/create">Start website setup</Link></div></section>}
        <p className="workspace-footnote">Support requests are stored in LUCIA OS and checked against your active organisation membership. This page does not promise a response time.</p><Link className="workspace-back" href="/workspace">Back to overview</Link>
      </section>
    </div>
  </main>;
}
