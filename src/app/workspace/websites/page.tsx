import Link from "next/link";
import { and, eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { memberships, organizations, websites } from "@/lib/db/schema";

export const metadata = { title: "Your websites" };

export default async function WorkspaceWebsitesPage() {
  const user = await getCurrentUser();
  if (!user) {
    return <main className="workspace-shell"><section className="workspace-card workspace-denied"><span className="workspace-kicker">YOUR WEBSITES</span><h1>Sign in to continue.</h1><p>Your saved website drafts are available after signing in with LUCIA ID.</p><Link className="workspace-button workspace-button-primary" href="/api/auth/login">Sign in with LUCIA ID</Link></section></main>;
  }

  const db = getDb();
  const orgs = await db.select({
    id: organizations.id,
    name: organizations.name,
    role: memberships.role,
  }).from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(and(eq(memberships.userId, user.id), eq(memberships.status, "active"), eq(organizations.status, "active")));

  const grouped = await Promise.all(orgs.map(async (org) => {
    const items = await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.current_organization_id', ${org.id}, true)`);
      return tx.select({
        id: websites.id,
        name: websites.name,
        slug: websites.slug,
        status: websites.status,
        createdAt: websites.createdAt,
        updatedAt: websites.updatedAt,
      }).from(websites).where(eq(websites.organizationId, org.id)).orderBy(sql`${websites.updatedAt} desc`);
    });
    return { ...org, websites: items };
  }));
  const total = grouped.reduce((sum, org) => sum + org.websites.length, 0);
  const siteDomain = (process.env.LUCIA_SITE_DOMAIN || "lucia.name.ng").trim().replace(/^\*\./, "").replace(/\.$/, "");

  return <main className="workspace-shell">
    <header className="workspace-topbar"><Link className="workspace-brand" href="/"><span className="workspace-brand-mark" aria-hidden="true"><i /></span><span>LUCIA <span className="workspace-brand-muted">OS</span></span></Link><div className="workspace-topbar-right"><span className="workspace-context">Organisation workspace</span><span className="workspace-avatar" aria-label="Signed-in user">{(user.displayName || "U").slice(0,1).toUpperCase()}</span></div></header>
    <div className="workspace-layout">
      <aside className="workspace-sidebar"><span className="workspace-sidebar-label">YOUR WORKSPACE</span><Link className="workspace-nav-item" href="/workspace"><span>▦</span> Overview</Link><Link className="workspace-nav-item workspace-nav-active" href="/workspace/websites"><span>◇</span> Websites</Link><Link className="workspace-nav-item" href="/workspace/domains"><span>⌘</span> Domains</Link><span className="workspace-sidebar-label workspace-sidebar-planned">YOUR TOOLS</span><Link className="workspace-nav-item" href="/workspace/team"><span>♙</span> Team &amp; access</Link><Link className="workspace-nav-item" href="/billing"><span>◷</span> Billing</Link><Link className="workspace-nav-item" href="/support"><span>◎</span> Help &amp; support</Link><Link className="workspace-nav-item" href="/publish"><span>↗</span> Publishing</Link><Link className="workspace-nav-item" href="/analytics"><span>⌁</span> Analytics</Link><div className="workspace-sidebar-bottom"><span className="workspace-status-dot" /> Membership verified</div></aside>
      <section className="workspace-main">
        <div className="workspace-heading"><div><span className="workspace-kicker">WEBSITE LIBRARY</span><h1>Your saved websites.</h1><p>Find the website drafts saved to organisations where you have an active membership.</p></div><Link className="workspace-button workspace-button-primary" href="/create">Create a website</Link></div>
        <div className="workspace-metrics"><article className="workspace-metric"><span className="workspace-metric-label">Saved websites</span><strong>{total}</strong><span className="workspace-metric-foot">Across your organisations</span></article><article className="workspace-metric"><span className="workspace-metric-label">Organisations</span><strong>{grouped.length}</strong><span className="workspace-metric-foot">Active memberships</span></article></div>
        {total ? grouped.filter((org) => org.websites.length > 0).map((org) => <section className="workspace-panel" key={org.id}><div className="workspace-panel-heading"><div><h2>{org.name}</h2><p>Your role: {org.role.replaceAll("_", " ")}</p></div><span className="workspace-count">{org.websites.length} website{org.websites.length === 1 ? "" : "s"}</span></div><div className="workspace-org-list">{org.websites.map((website) => <article className="workspace-org-card" key={website.id}><div className="workspace-org-avatar">W</div><div className="workspace-org-info"><h3>{website.name}</h3><p>{website.slug}.{siteDomain}</p><div className="workspace-org-meta"><span>Created {website.createdAt.toLocaleDateString()}</span><span>Updated {website.updatedAt.toLocaleDateString()}</span></div></div><span className={`workspace-status ${website.status === "published" ? "workspace-status-success" : "workspace-status-neutral"}`}>{website.status}</span><div className="workspace-website-actions"><Link className="workspace-button workspace-button-secondary workspace-website-edit" href={`/editor?websiteId=${encodeURIComponent(website.id)}`}>Edit website ↗</Link><Link className="workspace-button workspace-button-secondary" href={`/workspace/domains?websiteId=${encodeURIComponent(website.id)}`}>Manage domains</Link><Link className="workspace-button workspace-button-secondary" href={`/publish?websiteId=${encodeURIComponent(website.id)}`}>Publish website</Link>{website.status === "published" ? <a className="workspace-button workspace-button-primary" href={`https://${website.slug}.${siteDomain}`} target="_blank" rel="noreferrer">Open live site ↗</a> : null}</div></article>)}</div></section>) : <section className="workspace-panel"><div className="workspace-empty"><span className="workspace-empty-icon">◇</span><h3>No saved websites yet</h3><p>Create your first website draft. If setup was submitted more than once, we’ll reuse the existing organisation and matching website.</p><Link className="workspace-button workspace-button-secondary" href="/create">Start website setup</Link></div></section>}
        <p className="workspace-footnote">Your draft, publishing settings and live website are connected here. A website becomes public only after publishing succeeds. Custom-domain connection still needs its dedicated activation and verification workflow.</p>
        <Link className="workspace-back" href="/workspace">Back to overview</Link>
      </section>
    </div>
  </main>;
}
