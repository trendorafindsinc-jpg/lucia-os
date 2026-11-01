import Link from "next/link";
import { and, ne, eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrganizationMembershipsForUser } from "@/lib/access/guards";
import { hasOrganizationPermission } from "@/lib/access/policy";
import { getDb } from "@/lib/db/client";
import { websites } from "@/lib/db/schema";
import "./website-picker.css";
import { SavedWebsiteThumbnail } from "./saved-website-thumbnail";

export const metadata = { title: "Your websites | Layout Studio" };
export const dynamic = "force-dynamic";

export default async function WorkspaceWebsitesPage() {
  const user = await getCurrentUser();
  if (!user) {
    return <main className="studio-picker"><section className="studio-picker-empty">
      <h1>Sign in to open your websites</h1><p>Use LUCIA ID to see only websites you are allowed to access.</p>
      <Link className="studio-picker-primary" href="/api/auth/login?returnTo=%2Fworkspace%2Fwebsites">Sign in with LUCIA ID</Link>
    </section></main>;
  }
  const db = getDb();
  const orgs = (await getOrganizationMembershipsForUser(user.id)).filter((org) =>
    hasOrganizationPermission({ role: org.role, status: org.membershipStatus }, "website.read"));
  const groups = await Promise.all(orgs.map(async (org) => {
    const items = await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.current_user_id', ${user.id}, true), set_config('app.current_organization_id', ${org.id}, true)`);
      return tx.select({
        id: websites.id, name: websites.name, slug: websites.slug, status: websites.status,
        updatedAt: websites.updatedAt,
      }).from(websites).where(and(eq(websites.organizationId, org.id), ne(websites.status, "deleted")))
        .orderBy(websites.updatedAt);
    });
    return { name: org.name, id: org.id, items };
  }));
  const count = groups.reduce((total, group) => total + group.items.length, 0);
  const host = (process.env.LUCIA_SITE_DOMAIN || "lucia.name.ng").trim().replace(/^\*\./, "").replace(/\.$/, "");
  return <main className="studio-picker">
    <nav className="studio-picker-nav" aria-label="Layout Studio"><Link href="/workspace">← Workspace</Link><span>LUCIA OS · Layout Studio</span></nav>
    <header className="studio-picker-heading"><div><p className="studio-picker-eyebrow">LAYOUT STUDIO</p>
      <h1>Your websites</h1><p>Select a website to edit it directly, or create something new.</p></div>
      <Link className="studio-picker-primary" href="/create">+ Create New Website</Link>
    </header>
    {count === 0 ? <section className="studio-picker-empty">
      <div className="studio-picker-empty-mark" aria-hidden="true">✦</div>
      <h2>Create your first website.</h2>
      <p>Just three required answers, a design you like, and you can begin editing.</p>
      <Link className="studio-picker-primary" href="/create">Create New Website</Link>
    </section> : groups.filter((group) => group.items.length > 0).map((group) =>
      <section key={group.id} className="studio-picker-group" aria-label={group.name}>
        <h2>{group.name}</h2><div className="studio-picker-grid">
          {group.items.map((site) => {
            const address = site.slug + "." + host;
            return <article key={site.id} className="studio-picker-card">
              <SavedWebsiteThumbnail websiteId={site.id} name={site.name} />
              <div className="studio-picker-card-body"><div className="studio-picker-card-title">
                <h3>{site.name}</h3><span className={site.status === "published" ? "studio-picker-live" : "studio-picker-draft"}>
                  {site.status === "published" ? "Published" : "Draft"}</span></div>
                <p className="studio-picker-address">{address}</p><p className="studio-picker-updated">Updated {site.updatedAt.toLocaleDateString()}</p>
                <div className="studio-picker-actions"><Link className="studio-picker-primary" href={{ pathname: "/editor", query: { websiteId: site.id } }}>Edit Website</Link>
                  {site.status === "published" ? <a href={"https://" + address} target="_blank" rel="noopener noreferrer">View live website</a> : null}
                  <Link href={{ pathname: "/editor", query: { websiteId: site.id, content: "blog" } }}>Write Blog</Link>
                  <Link href={{ pathname: "/editor", query: { websiteId: site.id, content: "news" } }}>Publish News</Link>
                  <Link href={{ pathname: "/editor", query: { websiteId: site.id }, hash: "media-library" }}>Manage Media</Link>
                </div>
                <p className="studio-picker-coming">Blog and News drafts are managed within this website. Video and document uploads are not yet enabled.</p>
              </div>
            </article>;
          })}
        </div>
      </section>)}
  </main>;
}
