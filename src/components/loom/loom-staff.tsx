"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type VerificationRequest = { id: string; userId: string; displayName: string | null; evidenceType: string; evidenceReference: string; status: string; reviewNote: string | null; submittedAt: string };
type Report = { id: string; reporterUserId: string; reporterName: string | null; targetType: string; targetId: string; reason: string; details: string; status: string; createdAt: string };

export function LoomStaff() {
  const [tab, setTab] = useState<"verification" | "reports">("verification");
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [hideContent, setHideContent] = useState<Record<string, boolean>>({});
  const [memberActions, setMemberActions] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(""); setNotice("");
    try {
      const [verificationResponse, reportResponse] = await Promise.all([
        fetch("/api/loom/staff/verification", { cache: "no-store" }),
        fetch("/api/loom/staff/reports", { cache: "no-store" }),
      ]);
      const verificationPayload = await verificationResponse.json() as { requests?: VerificationRequest[]; error?: string };
      const reportPayload = await reportResponse.json() as { reports?: Report[]; error?: string };
      if (!verificationResponse.ok) throw new Error(verificationPayload.error || "Verification queue is unavailable.");
      if (!reportResponse.ok) throw new Error(reportPayload.error || "Moderation queue is unavailable.");
      setVerifications(verificationPayload.requests || []);
      setReports(reportPayload.reports || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Staff queues could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function reviewVerification(item: VerificationRequest, decision: "verified" | "rejected") {
    setBusyId(item.id); setError(""); setNotice("");
    try {
      const response = await fetch("/api/loom/staff/verification", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ verificationId: item.id, decision, reviewNote: notes[item.id] || "" }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Verification decision could not be saved.");
      setNotice("Verification request " + decision + ".");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Verification decision could not be saved.");
    } finally {
      setBusyId("");
    }
  }

  async function reviewReport(item: Report, decision: "resolved" | "dismissed") {
    setBusyId(item.id); setError(""); setNotice("");
    try {
      const response = await fetch("/api/loom/staff/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ reportId: item.id, decision, hideContent: Boolean(hideContent[item.id]), memberAction: memberActions[item.id] || "none" }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Report decision could not be saved.");
      setNotice("Report " + decision + (hideContent[item.id] ? " and content moderated." : "."));
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Report decision could not be saved.");
    } finally {
      setBusyId("");
    }
  }

  return <main className="loom-page">
    <header className="loom-topbar"><Link className="loom-brand" href="/workspace"><span className="loom-brand-mark">L</span><span>LUCIA <b>LOOM</b></span></Link><nav><Link href="/loom">Community feed</Link><span className="loom-nav-active">Staff review</span></nav><Link className="loom-workspace-link" href="/workspace">Workspace ↗</Link></header>
    <div className="loom-section-layout"><aside className="loom-left-rail"><span className="loom-rail-label">STAFF TOOLS</span><button type="button" className={tab === "verification" ? "loom-rail-active" : ""} onClick={() => setTab("verification")}>Business verification</button><button type="button" className={tab === "reports" ? "loom-rail-active" : ""} onClick={() => setTab("reports")}>Report queue</button><p className="loom-privacy-note">Staff actions are permission-checked on the server and recorded in the platform audit log.</p></aside>
      <section className="loom-section-main"><span className="loom-eyebrow">AUTHORISED STAFF ONLY</span><h1>{tab === "verification" ? "Business verification" : "Community moderation"}</h1><p className="loom-section-description">{tab === "verification" ? "Review registration or domain evidence. Never approve a request automatically." : "Review reports, then resolve or dismiss them. Hiding content is a separate, explicit action."}</p>
        <div className="loom-staff-tabs"><button type="button" className={tab === "verification" ? "loom-staff-tab-active" : ""} onClick={() => setTab("verification")}>Verification ({verifications.length})</button><button type="button" className={tab === "reports" ? "loom-staff-tab-active" : ""} onClick={() => setTab("reports")}>Reports ({reports.length})</button><button type="button" onClick={() => void load()}>Refresh</button></div>
        {error && <div className="loom-error" role="alert"><span>{error}</span><button type="button" onClick={() => void load()}>Retry</button></div>}
        {notice && <p className="loom-notice" role="status">{notice}</p>}
        {loading ? <div className="loom-feed-state">Loading staff queues…</div> : tab === "verification" ? verifications.length ? <div className="loom-staff-list">{verifications.map(item => <article className="loom-staff-card" key={item.id}><div className="loom-staff-card-heading"><div><span className="loom-eyebrow">BUSINESS VERIFICATION</span><h2>{item.displayName || "LUCIA member"}</h2></div><span className="loom-connection-status">{item.status}</span></div><dl><dt>Evidence type</dt><dd>{item.evidenceType === "registration" ? "Business registration" : "Business domain"}</dd><dt>Evidence reference</dt><dd className="loom-evidence-reference">{item.evidenceReference}</dd><dt>Submitted</dt><dd>{new Date(item.submittedAt).toLocaleString()}</dd></dl><label htmlFor={"loom-review-note-" + item.id}>Review note (optional; required context for rejection)</label><textarea id={"loom-review-note-" + item.id} rows={3} maxLength={1000} value={notes[item.id] || ""} onChange={event => setNotes(current => ({ ...current, [item.id]: event.target.value }))} placeholder="Record the basis for your decision."/><div className="loom-staff-actions"><button type="button" disabled={busyId === item.id} onClick={() => void reviewVerification(item, "verified")}>{busyId === item.id ? "Saving…" : "Approve verification"}</button><button type="button" className="loom-staff-secondary" disabled={busyId === item.id || !(notes[item.id] || "").trim()} onClick={() => void reviewVerification(item, "rejected")}>Reject with note</button></div></article>)}</div> : <div className="loom-feed-state loom-empty"><h3>No pending verification requests.</h3><p>New business identity requests will appear here for authorised review.</p></div> : reports.length ? <div className="loom-staff-list">{reports.map(item => <article className="loom-staff-card" key={item.id}><div className="loom-staff-card-heading"><div><span className="loom-eyebrow">REPORTED {item.targetType.toUpperCase()}</span><h2>{item.reason.replaceAll("_", " ")}</h2></div><span className="loom-connection-status">{item.status}</span></div><dl><dt>Reported by</dt><dd>{item.reporterName || "LUCIA member"}</dd><dt>Target reference</dt><dd className="loom-evidence-reference">{item.targetId}</dd><dt>Submitted</dt><dd>{new Date(item.createdAt).toLocaleString()}</dd></dl><p>{item.details || "No additional details provided."}</p><label className="loom-staff-checkbox"><input type="checkbox" checked={Boolean(hideContent[item.id])} onChange={event => setHideContent(current => ({ ...current, [item.id]: event.target.checked }))}/> Hide reported content while resolving (where supported)</label><label htmlFor={"loom-member-action-" + item.id}>Member access action</label><select id={"loom-member-action-" + item.id} value={memberActions[item.id] || "none"} onChange={event => setMemberActions(current => ({ ...current, [item.id]: event.target.value }))}><option value="none">No account action</option><option value="restrict">Restrict participation</option><option value="ban">Remove Loom access</option><option value="lift">Lift an existing restriction</option></select><div className="loom-staff-actions"><button type="button" disabled={busyId === item.id} onClick={() => void reviewReport(item, "resolved")}>Resolve report</button><button type="button" className="loom-staff-secondary" disabled={busyId === item.id} onClick={() => void reviewReport(item, "dismissed")}>Dismiss report</button></div></article>)}</div> : <div className="loom-feed-state loom-empty"><h3>No open reports.</h3><p>New community reports will appear here for authorised review.</p></div>}
      </section>
    </div>
  </main>;
}
