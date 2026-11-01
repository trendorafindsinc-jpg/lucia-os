import { StaffNavigation } from "@/components/support/staff-navigation";
import Link from "next/link";
import { and, desc, eq, ilike } from "drizzle-orm";
import { getCurrentStaffUser } from "@/lib/access/guards";
import { withPlatformStaffScope } from "@/lib/db/tenant-scope";
import { organizations, supportCases } from "@/lib/db/schema";

export const metadata = { title: "Customer support | LUCIA Staff" };
export const dynamic = "force-dynamic";

export default async function StaffSupportPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentStaffUser("support.cases.read");
  if (!user) {
    return <main className="workspace-shell"><section className="workspace-card workspace-denied"><span className="workspace-kicker">LUCIA TEAM · SUPPORT</span><h1>Staff access required</h1><p>Sign in with a LUCIA ID that has an active customer-support permission.</p><Link className="workspace-button workspace-button-primary" href="/api/auth/login?returnTo=%2Fstaff%2Fsupport">Sign in with LUCIA ID</Link><Link className="workspace-back" href="/staff">Back to staff overview</Link></section></main>;
  }

  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const status = typeof params.status === "string" && ["open", "in_progress", "waiting_on_customer", "waiting_on_staff", "resolved", "closed"].includes(params.status) ? params.status : "";
  const priority = typeof params.priority === "string" && ["low", "normal", "high", "urgent"].includes(params.priority) ? params.priority : "";
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
      .where(and(status ? eq(supportCases.status, status) : undefined, priority ? eq(supportCases.priority, priority) : undefined, q ? ilike(supportCases.subject, `%${q}%`) : undefined))
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
      <StaffNavigation active="support" />
      <section className="workspace-main">
        <div className="workspace-heading"><div><span className="workspace-kicker">LUCIA TEAM · CUSTOMER CARE</span><h1>Customer support</h1><p>Review and open support cases across LUCIA OS organisations.</p></div><Link className="workspace-button workspace-button-secondary" href="/staff">Back to overview</Link></div>
        <div className="workspace-metrics">
          <article className="workspace-metric"><span className="workspace-metric-label">Cases in this queue</span><strong>{cases.length}</strong><span className="workspace-metric-foot">Latest 100 matching cases</span></article>
          <article className="workspace-metric"><span className="workspace-metric-label">Open cases</span><strong>{openCount}</strong><span className="workspace-metric-foot">Not resolved or closed</span></article>
          <article className="workspace-metric"><span className="workspace-metric-label">Urgent cases</span><strong>{urgentCount}</strong><span className="workspace-metric-foot">Open and urgent</span></article>
        </div>
        <section className="workspace-panel">
          <form className="lucia-support-form" action="/staff/support"><label>Search case subjects<input name="q" defaultValue={q} maxLength={100} /></label><label>Status<select name="status" defaultValue={status}><option value="">All statuses</option>{["open", "in_progress", "waiting_on_customer", "waiting_on_staff", "resolved", "closed"].map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label><label>Priority<select name="priority" defaultValue={priority}><option value="">All priorities</option>{["low", "normal", "high", "urgent"].map(value => <option key={value} value={value}>{value}</option>)}</select></label><div className="lucia-support-actions"><button type="submit" className="workspace-button workspace-button-primary">Filter queue</button><Link className="workspace-button workspace-button-secondary" href="/staff/support">Clear filters</Link></div></form>
          <div className="workspace-panel-heading"><div><h2>Support queue</h2><p>Select a case to view the conversation and reply using your staff permissions.</p></div><span className="workspace-count">{cases.length} records</span></div>
          {cases.length ? <div className="workspace-table-wrap"><table className="workspace-table"><thead><tr><th>Case</th><th>Organisation</th><th>Priority</th><th>Status</th><th>Updated</th><th>Action</th></tr></thead><tbody>{cases.map((item) => <tr key={item.id}><td><strong>{item.subject}</strong><span className="workspace-table-sub">{item.category.replaceAll("_", " ")}</span></td><td>{item.organizationName}</td><td><span className={`workspace-status workspace-status-${item.priority}`}>{item.priority.replaceAll("_", " ")}</span></td><td><span className="workspace-status workspace-status-neutral">{item.status.replaceAll("_", " ")}</span></td><td>{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(item.updatedAt)}</td><td><Link className="workspace-button workspace-button-secondary" href={`/staff/support/${item.id}`}>Open case</Link></td></tr>)}</tbody></table></div> : <div className="workspace-empty"><span className="workspace-empty-icon">◎</span><h3>No matching support cases</h3><p>Try clearing filters or return when a customer opens a case.</p></div>}
        </section>
        <p className="workspace-footnote">Only staff with an active support.cases.read grant can view this queue. Replies and case updates are checked separately on the server.</p>
      </section>
    </div>
  </main>;
}
