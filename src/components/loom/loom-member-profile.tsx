"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";

type Profile = { userId: string; displayName: string | null; businessName: string | null; bio: string; website: string | null; createdAt: string | null };

export function LoomMemberProfile({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isSelf, setIsSelf] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("other");
  const [details, setDetails] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [blockBusy, setBlockBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/loom/members/" + encodeURIComponent(userId), { cache: "no-store" });
      const payload = await response.json() as { profile?: Profile; isSelf?: boolean; error?: string };
      if (!response.ok || !payload.profile) throw new Error(payload.error || "Profile could not be loaded.");
      setProfile(payload.profile); setIsSelf(Boolean(payload.isSelf));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Profile could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reportBusy) return;
    setReportBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/loom/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ targetType: "profile", targetId: userId, reason, details }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Report could not be submitted.");
      setNotice("Profile report submitted for staff review."); setReportOpen(false); setDetails("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Report could not be submitted.");
    } finally {
      setReportBusy(false);
    }
  }

  async function blockMember() {
    if (blockBusy) return;
    setBlockBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/loom/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ userId }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Member could not be blocked.");
      setNotice("Member blocked. Their posts and private interactions are now hidden from you.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Member could not be blocked.");
    } finally {
      setBlockBusy(false);
    }
  }

  return <main className="loom-page"><header className="loom-topbar"><Link className="loom-brand" href="/workspace"><span className="loom-brand-mark">L</span><span>LUCIA <b>LOOM</b></span></Link><nav><Link href="/loom">Feed</Link><Link href="/loom/discover">Discover</Link><span className="loom-nav-active">Member profile</span></nav><Link className="loom-workspace-link" href="/workspace">Workspace ↗</Link></header>
    <div className="loom-section-layout"><aside className="loom-left-rail"><span className="loom-rail-label">YOUR LOOM</span><Link href="/loom">Community feed</Link><Link href="/loom/discover">Discover</Link><Link href="/loom/groups">Groups</Link><Link href="/loom/connections">Connections</Link><Link href="/loom/messages">Messages</Link><Link href="/loom/blocks">Blocked members</Link></aside>
      <section className="loom-section-main"><Link href="/loom/discover">← Discover businesses</Link>
        {loading ? <div className="loom-feed-state">Loading profile…</div> : profile ? <><span className="loom-eyebrow">VERIFIED LOOM MEMBER</span><div className="loom-public-profile-heading"><div className="loom-public-profile-avatar">{(profile.businessName || profile.displayName || "L").trim().slice(0,1).toUpperCase()}</div><div><h1>{profile.businessName || profile.displayName || "LUCIA member"}</h1>{profile.businessName && profile.displayName && <p>{profile.displayName}</p>}</div></div><div className="loom-public-profile-card"><h2>About the business</h2><p>{profile.bio || "This member has not added a public introduction yet."}</p>{profile.website && /^https?:\/\//i.test(profile.website) && <p><a href={profile.website} target="_blank" rel="noreferrer">Visit business website ↗</a></p>}{profile.createdAt && <p className="loom-privacy-note">Member since {new Date(profile.createdAt).toLocaleDateString()}</p>}</div>
          {!isSelf && <div className="loom-profile-actions"><button type="button" className="loom-block-button" disabled={blockBusy} onClick={() => void blockMember()}>{blockBusy ? "Blocking…" : "Block member"}</button><button type="button" className="loom-report-toggle" onClick={() => setReportOpen(current => !current)}>{reportOpen ? "Cancel report" : "Report profile"}</button></div>}
          {reportOpen && !isSelf && <form className="loom-report-form" onSubmit={submitReport}><label htmlFor="loom-profile-report-reason">Reason</label><select id="loom-profile-report-reason" value={reason} onChange={event => setReason(event.target.value)}><option value="spam">Spam</option><option value="harassment">Harassment</option><option value="misinformation">Misleading information</option><option value="privacy">Privacy concern</option><option value="other">Other</option></select><label htmlFor="loom-profile-report-details">Details (optional)</label><textarea id="loom-profile-report-details" rows={3} maxLength={1000} value={details} onChange={event => setDetails(event.target.value)} placeholder="Explain the concern for the review team."/><button type="submit" disabled={reportBusy}>{reportBusy ? "Submitting…" : "Submit report"}</button></form>}
        </> : <div className="loom-feed-state loom-empty"><h3>Profile unavailable.</h3><p>This verified public profile may have been hidden, removed, or blocked.</p><Link href="/loom/discover">Return to discovery ↗</Link></div>}
        {error && <div className="loom-error" role="alert"><span>{error}</span><button type="button" onClick={() => void load()}>Retry</button></div>}
        {notice && <p className="loom-notice" role="status">{notice}</p>}
      </section>
    </div>
  </main>;
}
