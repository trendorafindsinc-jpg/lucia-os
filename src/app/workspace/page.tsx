import Link from "next/link";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { billingInvoices, memberships, organizations, supportCases, websites } from "@/lib/db/schema";
import { hasOrganizationPermission } from "@/lib/access/policy";

export const metadata = { title: "Organisation workspace" };

export default async function OrganizationWorkspacePage() {
  const user = await getCurrentUser();
  if (!user) {
    return <main className="workspace-shell"><section className="workspace-card workspace-denied"><span className="workspace-kicker">YOUR ORGANISATION</span><h1>Your work, securely together.</h1><p>Sign in with LUCIA ID to view organisations you belong to.</p><Link className="workspace-button workspace-button-primary" href="/api/auth/login">Sign in with LUCIA ID</Link><Link className="workspace-back" href="/">Back to LUCIA OS</Link></section></main>;
  }

  const db = getDb();
  const orgs = await db.select({
    id: organizations.id,
    name: organizations.name,
    slug: organizations.slug,
    status: organizations.status,
    role: memberships.role,
    membershipStatus: memberships.status,
  }).from(memberships).innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(and(eq(memberships.userId, user.id), eq(memberships.status, "active")))
    .orderBy(desc(organizations.updatedAt));

  const summaries = await Promise.all(orgs.map(async (org) => {
    const [websiteSummary] = await db.select({ total: count() }).from(websites).where(eq(websites.organizationId, org.id));
    const [invoiceSummary] = await db.select({ total: count() }).from(billingInvoices).where(eq(billingInvoices.organizationId, org.id));
    const [caseSummary] = await db.select({ total: count() }).from(supportCases).where(eq(supportCases.organizationId, org.id));
    return { ...org, websiteCount: websiteSummary.total, invoiceCount: invoiceSummary.total, caseCount: caseSummary.total };
  }));

  return <main className="workspace-shell">
    <header className="workspace-topbar"><Link className="workspace-brand" href="/"><span className="workspace-brand-mark">L</span><span>LUCIA <span className="workspace-brand-muted">OS</span></span></Link><div className="workspace-topbar-right"><span className="workspace-context">Organisation workspace</span><span className="workspace-avatar" aria-label="Signed-in user">{(user.displayName || "U").slice(0,1).toUpperCase()}</span></div></header>
    <div className="workspace-layout">
      <aside className="workspace-sidebar"><span className="workspace-sidebar-label">YOUR WORKSPACE</span><div className="workspace-nav-item workspace-nav-active"><span>▦</span> Overview</div><div className="workspace-nav-item workspace-nav-muted"><span>◇</span> Websites</div><div className="workspace-nav-item workspace-nav-muted"><span>♙</span> Team &amp; access</div><div className="workspace-nav-item workspace-nav-muted"><span>◷</span> Billing</div><div className="workspace-nav-item workspace-nav-muted"><span>◎</span> Help &amp; support</div><div className="workspace-sidebar-bottom"><span className="workspace-status-dot" /> Membership verified</div></aside>
      <section className="workspace-main">
        <div className="workspace-heading"><div><span className="workspace-kicker">YOUR ORGANISATIONS</span><h1>A calmer way to run your work.</h1><p>One place to see your websites, team, billing and support across organisations you belong to.</p></div><span className="workspace-live-pill"><span /> Live database view</span></div>
        <div className="workspace-metrics"><article className="workspace-metric"><span className="workspace-metric-label">Organisations</span><strong>{summaries.length}</strong><span className="workspace-metric-foot">Active memberships</span></article><article className="workspace-metric"><span className="workspace-metric-label">Websites</span><strong>{summaries.reduce((sum, org) => sum + org.websiteCount, 0)}</strong><span className="workspace-metric-foot">Across your organisations</span></article><article className="workspace-metric"><span className="workspace-metric-label">Support cases</span><strong>{summaries.reduce((sum, org) => sum + org.caseCount, 0)}</strong><span className="workspace-metric-foot">Cases within your organisations</span></article></div>
        <section className="workspace-panel"><div className="workspace-panel-heading"><div><h2>Your organisations</h2><p>Only organisations with your active membership are shown.</p></div><span className="workspace-count">{summaries.length} total</span></div>
          {summaries.length ? <div className="workspace-org-list">{summaries.map((org) => <article className="workspace-org-card" key={org.id}><div className="workspace-org-avatar">{org.name.slice(0,1).toUpperCase()}</div><div className="workspace-org-info"><h3>{org.name}</h3><p>{org.slug} · {org.role.replaceAll("_", " ")}</p><div className="workspace-org-meta"><span>{org.websiteCount} websites</span><span>{org.invoiceCount} invoices</span><span>{org.caseCount} support cases</span></div></div><span className={`workspace-status ${org.status === "active" ? "workspace-status-success" : "workspace-status-neutral"}`}>{org.status}</span></article>)}</div> : <div className="workspace-empty"><span className="workspace-empty-icon">◇</span><h3>Your workspace starts here</h3><p>When you create an organisation or are invited to one, it will appear here.</p><Link className="workspace-button workspace-button-secondary" href="/create">Start website setup</Link></div>}
        </section>
        <p className="workspace-footnote">Your view is limited to active memberships stored in LUCIA OS. Staff privileges are managed separately.</p>
      </section>
    </div>
  </main>;
}
