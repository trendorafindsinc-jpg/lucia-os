import { StaffFrame } from "@/components/support/staff-frame";
import { StaffNavigation } from "@/components/support/staff-navigation";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { withPlatformStaffScope, withUserScope } from "@/lib/db/tenant-scope";
import { organizations, staffGrants, supportCases } from "@/lib/db/schema";
import { hasPlatformStaffAccess, hasStaffPermission } from "@/lib/access/policy";

export const metadata = { title: "LUCIA Staff" };

export default async function StaffWorkspacePage() {
  const user = await getCurrentUser();
  if (!user) {
    return <main className="workspace-shell"><section className="workspace-card workspace-denied"><span className="workspace-kicker">LUCIA OS · STAFF</span><h1>Sign in to continue</h1><p>Use your LUCIA ID to access the staff workspace.</p><Link className="workspace-button workspace-button-primary" href="/api/auth/login?returnTo=%2Fstaff">Sign in with LUCIA ID</Link><Link className="workspace-back" href="/">Back to LUCIA OS</Link></section></main>;
  }

  const grants = await withUserScope(user.id, (tx) =>
    tx.select({ role: staffGrants.role, status: staffGrants.status, expiresAt: staffGrants.expiresAt })
      .from(staffGrants).where(eq(staffGrants.userId, user.id)),
  );
  if (!hasPlatformStaffAccess(grants)) {
    return <main className="workspace-shell"><section className="workspace-card workspace-denied"><span className="workspace-kicker">RESTRICTED WORKSPACE</span><div className="workspace-lock" aria-hidden="true">⌑</div><h1>Staff access required</h1><p>Your LUCIA ID is recognised, but this account does not have an active staff grant.</p><Link className="workspace-button workspace-button-secondary" href="/">Return to LUCIA OS</Link></section></main>;
  }

  if (!hasStaffPermission(grants, "support.cases.read")) {
    return <StaffFrame active="overview"><div className="workspace-heading"><div><span className="workspace-kicker">LUCIA TEAM · SECURITY</span><h1>Staff operations</h1><p>Your active staff grant gives access to security review. Customer conversations require a separate support permission.</p></div></div><Link className="workspace-button workspace-button-primary" href="/staff/audit">Review audit history</Link></StaffFrame>;
  }

  // Establish staff context only after the grant and required permission above passed.
  const cases = hasStaffPermission(grants, "support.cases.read") ? await withPlatformStaffScope(user.id, async (tx) =>
    tx.select({
      id: supportCases.id,
      subject: supportCases.subject,
      category: supportCases.category,
      priority: supportCases.priority,
      status: supportCases.status,
      updatedAt: supportCases.updatedAt,
      organizationName: organizations.name,
    }).from(supportCases).innerJoin(organizations, eq(supportCases.organizationId, organizations.id))
      .orderBy(desc(supportCases.updatedAt)).limit(12),
  ) : [];

  const openCount = cases.filter((item) => !["resolved", "closed"].includes(item.status)).length;
  const urgentCount = cases.filter((item) => item.priority === "urgent" && !["resolved", "closed"].includes(item.status)).length;

  return <main className="workspace-shell">
    <header className="workspace-topbar">
      <Link className="workspace-brand" href="/staff"><span className="workspace-brand-mark">L</span><span>LUCIA <span className="workspace-brand-muted">OS</span></span></Link>
      <div className="workspace-topbar-right"><span className="workspace-context">Platform operations</span><span className="workspace-avatar" aria-label="Signed-in user">{(user.displayName || "S").slice(0,1).toUpperCase()}</span></div>
    </header>
    <div className="workspace-layout">
      <StaffNavigation active="overview" />
      <section className="workspace-main">
        <div className="workspace-heading"><div><span className="workspace-kicker">LUCIA TEAM · OPERATIONS</span><h1>Good work starts with clarity.</h1><p>Review customer issues and keep platform operations moving.</p></div><span className="workspace-live-pill"><span /> Live database view</span></div>
        <div className="workspace-metrics">
          <article className="workspace-metric"><span className="workspace-metric-label">Cases in latest view</span><strong>{cases.length}</strong><span className="workspace-metric-foot">Most recently updated</span></article>
          <article className="workspace-metric"><span className="workspace-metric-label">Open cases in view</span><strong>{openCount}</strong><span className="workspace-metric-foot">Excludes resolved and closed</span></article>
          <article className="workspace-metric"><span className="workspace-metric-label">Urgent cases in view</span><strong>{urgentCount}</strong><span className="workspace-metric-foot">Needs careful prioritisation</span></article>
        </div>
        <section className="workspace-panel"><div className="workspace-panel-heading"><div><h2>Recent customer cases</h2><p>Latest 12 records, ordered by last update.</p></div><span className="workspace-count">{cases.length} records</span></div>
          {cases.length ? <div className="workspace-table-wrap"><table className="workspace-table"><thead><tr><th>Case</th><th>Organisation</th><th>Priority</th><th>Status</th><th>Updated</th></tr></thead><tbody>{cases.map((item) => <tr key={item.id}><td><Link href={`/staff/support/${item.id}`}><strong>{item.subject}</strong></Link><span className="workspace-table-sub">{item.category.replaceAll("_", " ")}</span></td><td>{item.organizationName}</td><td><span className={`workspace-status workspace-status-${item.priority}`}>{item.priority.replaceAll("_", " ")}</span></td><td><span className="workspace-status workspace-status-neutral">{item.status.replaceAll("_", " ")}</span></td><td>{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(item.updatedAt)}</td></tr>)}</tbody></table></div> : <div className="workspace-empty"><span className="workspace-empty-icon">◎</span><h3>Your queue is clear</h3><p>Your role determines which operations you can access. Use the staff navigation for your permitted tasks.</p></div>}
        </section>
        <p className="workspace-footnote">Staff privileges are checked against LUCIA OS records. Tenant membership alone never grants platform access.</p>
      </section>
    </div>
  </main>;
}
