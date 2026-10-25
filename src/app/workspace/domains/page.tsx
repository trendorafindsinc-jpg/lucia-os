import Link from "next/link";
import { eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrganizationMembershipsForUser } from "@/lib/access/guards";
import { hasOrganizationPermission } from "@/lib/access/policy";
import { getDb } from "@/lib/db/client";
import { websiteDomains, websites } from "@/lib/db/schema";
import { DomainManagementClient } from "@/components/domains/domain-management-client";
import "./domains.css";

export const metadata = { title: "Domains | LUCIA OS" };

export default async function WorkspaceDomainsPage({ searchParams }: { searchParams: Promise<{ websiteId?: string }> }) {
  const user = await getCurrentUser();
  if (!user) return <main className="workspace-shell"><section className="workspace-card workspace-denied"><span className="workspace-kicker">DOMAIN MANAGEMENT</span><h1>Sign in to continue.</h1><p>Use LUCIA ID to manage domains for your websites.</p><Link className="workspace-button workspace-button-primary" href="/api/auth/login">Sign in with LUCIA ID</Link></section></main>;

  const db = getDb();
  const orgs = await getOrganizationMembershipsForUser(user.id);

  const manageable = orgs.filter((org) => hasOrganizationPermission({ role: org.role, status: org.membershipStatus }, "website.publish"));
  const groups = await Promise.all(manageable.map(async (org) => db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_organization_id', ${org.id}, true)`);
    const sites = await tx.select({ id: websites.id, name: websites.name, slug: websites.slug, status: websites.status })
      .from(websites).where(eq(websites.organizationId, org.id));
    const domains = await tx.select({
      id: websiteDomains.id, websiteId: websiteDomains.websiteId, hostname: websiteDomains.hostname,
      domainType: websiteDomains.domainType, status: websiteDomains.status, isPrimary: websiteDomains.isPrimary,
      createdAt: websiteDomains.createdAt,
    }).from(websiteDomains).where(eq(websiteDomains.organizationId, org.id));
    return { id: org.id, name: org.name, sites, domains };
  })));
  const siteDomain = (process.env.LUCIA_SITE_DOMAIN || "lucia.name.ng").trim().toLowerCase().replace(/^\*\./, "").replace(/\.$/, "");
  const websitesForClient = groups.flatMap((group) => group.sites.map((site) => ({ ...site, organizationId: group.id, organizationName: group.name })));
  const { websiteId } = await searchParams;
  const domainsForClient = groups.flatMap((group) => group.domains.map((domain) => ({
    ...domain, organizationId: group.id, organizationName: group.name,
    websiteName: group.sites.find((site) => site.id === domain.websiteId)?.name || "Website",
    websiteStatus: group.sites.find((site) => site.id === domain.websiteId)?.status || "unknown",
  })));

  return <main className="workspace-shell">
    <header className="workspace-topbar"><Link className="workspace-brand" href="/"><span className="workspace-brand-mark" aria-hidden="true"><i /></span><span>LUCIA <span className="workspace-brand-muted">OS</span></span></Link><div className="workspace-topbar-right"><span className="workspace-context">Domain management</span><span className="workspace-avatar" aria-label="Signed-in user">{(user.displayName || "U").slice(0,1).toUpperCase()}</span></div></header>
    <div className="workspace-layout">
      <aside className="workspace-sidebar"><span className="workspace-sidebar-label">YOUR WORKSPACE</span><Link className="workspace-nav-item" href="/workspace"><span>▦</span> Overview</Link><Link className="workspace-nav-item" href="/workspace/websites"><span>◇</span> Websites</Link><Link className="workspace-nav-item" href="/create"><span>✦</span> AI Studio</Link><Link className="workspace-nav-item" href="/templates"><span>▤</span> Loom</Link><Link className="workspace-nav-item" href="/billing"><span>◷</span> Plan &amp; Billing</Link><span className="workspace-sidebar-label workspace-sidebar-planned">WEBSITE TOOLS</span><Link className="workspace-nav-item workspace-nav-active" href="/workspace/domains"><span>⌘</span> Domains</Link><Link className="workspace-nav-item" href="/publish"><span>↗</span> Publishing</Link><Link className="workspace-nav-item" href="/analytics"><span>⌁</span> Analytics</Link><Link className="workspace-nav-item" href="/workspace/team"><span>♙</span> Team &amp; access</Link><Link className="workspace-nav-item" href="/support"><span>◎</span> Help &amp; support</Link><span className="workspace-sidebar-label workspace-sidebar-planned">FUTURE VERSIONS</span><span className="workspace-nav-item workspace-nav-muted" aria-disabled="true"><span>▣</span> Store — Unavailable in v1</span><span className="workspace-nav-item workspace-nav-muted" aria-disabled="true"><span>▥</span> Portals — Unavailable in v1</span><span className="workspace-nav-item workspace-nav-muted" aria-disabled="true"><span>⚙</span> Business Admin — Unavailable in v1</span><div className="workspace-sidebar-bottom"><span className="workspace-status-dot" /> Membership verified</div></aside>
      <section className="workspace-main domains-main">
        <div className="workspace-heading"><div><span className="workspace-kicker">WEBSITE ADDRESSES</span><h1>Every website, its own address.</h1><p>Register and verify domains here. Website editing and publishing stay separate, and a hostname can belong to only one website across LUCIA OS.</p></div><span className="workspace-live-pill"><span /> Domain registry</span></div>
        <div className="workspace-metrics"><article className="workspace-metric"><span className="workspace-metric-label">Registered domains</span><strong>{domainsForClient.length}</strong><span className="workspace-metric-foot">Across your manageable websites</span></article><article className="workspace-metric"><span className="workspace-metric-label">Websites</span><strong>{websitesForClient.length}</strong><span className="workspace-metric-foot">Each has an individual LUCIA address</span></article></div>
        <DomainManagementClient websites={websitesForClient} domains={domainsForClient} siteDomain={siteDomain} initialWebsiteId={websiteId} />
        <p className="workspace-footnote">Custom domains remain unavailable to the public until verification, the required one-time activation, and domain/TLS activation are completed. Registration alone never routes traffic to a website.</p>
        <Link className="workspace-back" href="/workspace/websites">Back to websites</Link>
      </section>
    </div>
  </main>;
}
