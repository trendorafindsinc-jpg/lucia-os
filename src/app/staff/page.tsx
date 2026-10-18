import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { organizations, staffGrants, supportCases } from "@/lib/db/schema";
import { hasStaffPermission } from "@/lib/access/policy";

export const metadata = { title: "LUCIA Staff" };

export default async function StaffWorkspacePage() {
  const user = await getCurrentUser();
  if (!user) {
    return <main className="workspace-shell"><section className="workspace-card workspace-denied"><span className="workspace-kicker">LUCIA OS · STAFF</span><h1>Sign in to continue</h1><p>Use your LUCIA ID to access the staff workspace.</p><Link className="workspace-button workspace-button-primary" href="/api/auth/login">Sign in with LUCIA ID</Link><Link className="workspace-back" href="/">Back to LUCIA OS</Link></section></main>;
  }

  const db = getDb();
  const grants = await db.select({ role: staffGrants.role, status: staffGrants.status, expiresAt: staffGrants.expiresAt })
    .from(staffGrants).where(eq(staffGrants.userId, user.id));
  if (!hasStaffPermission(grants, "support.cases.read")) {
    return <main className="workspace-shell"><section className="workspace-card workspace-denied"><span className="workspace-kicker">RESTRICTED WORKSPACE</span><div className="workspace-lock" aria-hidden="true">⌑</div><h1>Staff access required</h1><p>Your LUCIA ID is recognised, but this account does not have an active staff grant for customer support operations.</p><Link className="workspace-button workspace-button-secondary" href="/">Return to LUCIA OS</Link></section></main>;
  }

  const cases = await db.select({
    id: supportCases.id,
    subject: supportCases.subject,
    category: supportCases.category,
    priority: supportCases.priority,
    status: supportCases.status,
    updatedAt: supportCases.updatedAt,
    organizationName: organizations.name,
  }).from(supportCases).innerJoin(organizations, eq(supportCases.organizationId, organizations.id))
    .orderBy(desc(supportCases.updatedAt)).limit(12);

  const openCount = cases.filter((item) => !["resolved", "closed"].includes(item.status)).length;
  const urgentCount = cases.filter((item) => item.priority === "urgent" && !["resolved", "closed"].includes(item.status)).length;

  return <main className="workspace-shell">
    <header className="workspace-topbar">
      <Link className="workspace-brand" href="/"><span className="workspace-brand-mark">L</span><span>LUCIA <span className="workspace-brand-muted">OS</span></span></Link>
      <div className="workspace-topbar-right"><span className="workspace-context">Platform operations</span><span className="workspace-avatar" aria-label="Signed-in user">{(user.displayName || "S").slice(0,1).toUpperCase()}</span></div>
    </header>
    <div className="workspace-layout">
      <aside className="workspace-sidebar"><span className="workspace-sidebar-label">WORKSPACE</span><div className="workspace-nav-item workspace-nav-active"><span>▦</span> Overview</div><div className="workspace-nav-item workspace-nav-muted"><span>◎</span> Customer support</div><div className="workspace-nav-item workspace-nav-muted"><span>◇</span> Tenants &amp; websites</div><div className="workspace-nav-item workspace-nav-muted"><span>≋</span> Audit history</div><div className="workspace-sidebar-bottom"><span className="workspace-status-dot" /> Staff access verified</div></aside>
      <section className="workspace-main">
        <div className="workspace-heading"><div><span className="workspace-kicker">LUCIA TEAM · OPERATIONS</span><h1>Good work starts with clarity.</h1><p>Review customer issues and keep platform operations moving.</p></div><span className="workspace-live-pill"><span /> Live database view</span></div>
        <div className="workspace-metrics">
          <article className="workspace-metric"><span className="workspace-metric-label">Cases in latest view</span><strong>{cases.length}</strong><span className="workspace-metric-foot">Most recently updated</span></article>
          <article className="workspace-metric"><span className="workspace-metric-label">Open cases in view</span><strong>{openCount}</strong><span className="workspace-metric-foot">Excludes resolved and closed</span></article>
          <article className="workspace-metric"><span className="workspace-metric-label">Urgent cases in view</span><strong>{urgentCount}</strong><span className="workspace-metric-foot">Needs careful prioritisation</span></article>
        </div>
        <section className="workspace-panel"><div className="workspace-panel-heading"><div><h2>Recent customer cases</h2><p>Latest 12 records, ordered by last update.</p></div><span className="workspace-count">{cases.length} records</span></div>
          {cases.length ? <div className="workspace-table-wrap"><table className="workspace-table"><thead><tr><th>Case</th><th>Organisation</th><th>Priority</th><th>Status</th><th>Updated</th></tr></thead><tbody>{cases.map((item) => <tr key={item.id}><td><strong>{item.subject}</strong><span className="workspace-table-sub">{item.category.replaceAll("_", " ")}</span></td><td>{item.organizationName}</td><td><span className={`workspace-status workspace-status-${item.priority}`}>{item.priority.replaceAll("_", " ")}</span></td><td><span className="workspace-status workspace-status-neutral">{item.status.replaceAll("_", " ")}</span></td><td>{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(item.updatedAt)}</td></tr>)}</tbody></table></div> : <div className="workspace-empty"><span className="workspace-empty-icon">◎</span><h3>Your queue is clear</h3><p>Customer cases will appear here when an organisation contacts LUCIA support.</p></div>}
        </section>
        <p className="workspace-footnote">Staff privileges are checked against LUCIA OS records. Tenant membership alone never grants platform access.</p>
      </section>
    </div>
  </main>;
}
