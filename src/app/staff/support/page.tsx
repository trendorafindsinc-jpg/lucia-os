import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getCurrentStaffUser } from "@/lib/access/guards";
import { withPlatformStaffScope } from "@/lib/db/tenant-scope";
import { organizations, supportCases } from "@/lib/db/schema";

export const metadata = { title: "Customer support | LUCIA Staff" };
export const dynamic = "force-dynamic";

export default async function StaffSupportPage() {
  const user = await getCurrentStaffUser("support.cases.read");
  if (!user) {
    return <main className="workspace-shell"><section className="workspace-card workspace-denied"><span className="workspace-kicker">LUCIA TEAM · SUPPORT</span><h1>Staff access required</h1><p>Sign in with a LUCIA ID that has an active customer-support permission.</p><Link className="workspace-button workspace-button-primary" href="/api/auth/login?returnTo=%2Fstaff%2Fsupport">Sign in with LUCIA ID</Link><Link className="workspace-back" href="/staff">Back to staff overview</Link></section></main>;
  }

  const cases = await withPlatformStaffScope(user.id, (tx) =>
    tx.select({
      id: supportCases.id,
      subject: supportCases.subject,
      category: supportCases.category,
      priority: supportCases.priority,
      status: supportCases.status,
      updatedAt: supportCases.updatedAt,
      organizationName: organizations.name,
    }).from(supportCases)
      .innerJoin(organizations, eq(supportCases.organizationId, organizations.id))
      .orderBy(desc(supportCases.updatedAt))
      .limit(100),
  );
  const openCount = cases.filter((item) => !["resolved", "closed"].includes(item.status)).length;
  const urgentCount = cases.filter((item) => item.priority === "urgent" && !["resolved", "closed"].includes(item.status)).length;

  return <main className="workspace-shell">
    <header className="workspace-topbar">
      <Link className="workspace-brand" href="/staff"><span className="workspace-brand-mark">L</span><span>LUCIA <span className="workspace-brand-muted">OS</span></span></Link>
      <div className="workspace-topbar-right"><span className="workspace-context">Platform operations</span><span className="workspace-avatar" aria-label="Signed-in user">{(user.displayName || "S").slice(0, 1).toUpperCase()}</span></div>
    </header>
    <div className="workspace-layout">
      <aside className="workspace-sidebar">
        <span className="workspace-sidebar-label">STAFF WORKSPACE</span>
        <Link className="workspace-nav-item" href="/staff"><span>▦</span> Overview</Link>
        <Link className="workspace-nav-item workspace-nav-active" href="/staff/support"><span>◎</span> Customer support</Link>
        <span className="workspace-sidebar-label workspace-sidebar-planned">NOT ENABLED YET</span>
        <div className="workspace-nav-item workspace-nav-muted" aria-disabled="true"><span>◇</span> Tenants &amp; websites</div>
        <div className="workspace-nav-item workspace-nav-muted" aria-disabled="true"><span>≋</span> Audit history</div>
        <div className="workspace-sidebar-bottom"><span className="workspace-status-dot" /> Support permission verified</div>
      </aside>
      <section className="workspace-main">
        <div className="workspace-heading"><div><span className="workspace-kicker">LUCIA TEAM · CUSTOMER CARE</span><h1>Customer support</h1><p>Review and open support cases across LUCIA OS organisations.</p></div><Link className="workspace-button workspace-button-secondary" href="/staff">Back to overview</Link></div>
        <div className="workspace-metrics">
          <article className="workspace-metric"><span className="workspace-metric-label">Cases in this queue</span><strong>{cases.length}</strong><span className="workspace-metric-foot">Latest 100 updated cases</span></article>
          <article className="workspace-metric"><span className="workspace-metric-label">Open cases</span><strong>{openCount}</strong><span className="workspace-metric-foot">Not resolved or closed</span></article>
          <article className="workspace-metric"><span className="workspace-metric-label">Urgent cases</span><strong>{urgentCount}</strong><span className="workspace-metric-foot">Open and urgent</span></article>
        </div>
        <section className="workspace-panel">
          <div className="workspace-panel-heading"><div><h2>Support queue</h2><p>Select a case to view the conversation and reply using your staff permissions.</p></div><span className="workspace-count">{cases.length} records</span></div>
          {cases.length ? <div className="workspace-table-wrap"><table className="workspace-table"><thead><tr><th>Case</th><th>Organisation</th><th>Priority</th><th>Status</th><th>Updated</th><th>Action</th></tr></thead><tbody>{cases.map((item) => <tr key={item.id}><td><strong>{item.subject}</strong><span className="workspace-table-sub">{item.category.replaceAll("_", " ")}</span></td><td>{item.organizationName}</td><td><span className={`workspace-status workspace-status-${item.priority}`}>{item.priority.replaceAll("_", " ")}</span></td><td><span className="workspace-status workspace-status-neutral">{item.status.replaceAll("_", " ")}</span></td><td>{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(item.updatedAt)}</td><td><Link className="workspace-button workspace-button-secondary" href={`/support/${item.id}`}>Open case</Link></td></tr>)}</tbody></table></div> : <div className="workspace-empty"><span className="workspace-empty-icon">◎</span><h3>No support cases yet</h3><p>Cases submitted by organisations will appear in this queue.</p></div>}
        </section>
        <p className="workspace-footnote">Only staff with an active support.cases.read grant can view this queue. Replies and case updates are checked separately on the server.</p>
      </section>
    </div>
  </main>;
}
