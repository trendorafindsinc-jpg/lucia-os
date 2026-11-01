import Link from "next/link";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrganizationMembershipsForUser } from "@/lib/access/guards";
import { withOrganizationScope } from "@/lib/db/tenant-scope";
import { appUsers, memberships } from "@/lib/db/schema";
import { hasOrganizationPermission } from "@/lib/access/policy";
import { TeamMemberControls } from "@/components/support/team-member-controls";

export const metadata = { title: "People & access | LUCIA OS" };

export default async function WorkspaceTeamPage() {
  const user = await getCurrentUser();
  if (!user) return <main className="workspace-shell"><section className="workspace-card workspace-denied"><span className="workspace-kicker">PEOPLE & ACCESS</span><h1>Sign in to continue.</h1><p>Use LUCIA ID to view the people connected to your organisations.</p><Link className="workspace-button workspace-button-primary" href="/api/auth/login?returnTo=%2Fworkspace%2Fteam">Sign in with LUCIA ID</Link></section></main>;

  const ownOrgs = await getOrganizationMembershipsForUser(user.id);
  const visibleOrgs = ownOrgs.filter((org) => hasOrganizationPermission({ role: org.role, status: org.membershipStatus }, "members.read"));
  const groups = await Promise.all(visibleOrgs.map(async (org) => {
    const people = await withOrganizationScope(org.id, async (tx) =>
      tx.select({ id: appUsers.id, membershipId: memberships.id, displayName: appUsers.displayName, role: memberships.role, status: memberships.status, joinedAt: memberships.createdAt })
        .from(memberships).innerJoin(appUsers, eq(memberships.userId, appUsers.id))
        .where(eq(memberships.organizationId, org.id)),
    );
    return { ...org, people };
  }));

  return <main className="workspace-shell">
    <header className="workspace-topbar"><Link className="workspace-brand" href="/"><span className="workspace-brand-mark" aria-hidden="true"><i /></span><span>LUCIA <span className="workspace-brand-muted">OS</span></span></Link><div className="workspace-topbar-right"><span className="workspace-context">People & access</span><span className="workspace-avatar">{(user.displayName || "U").slice(0,1).toUpperCase()}</span></div></header>
    <div className="workspace-layout"><aside className="workspace-sidebar"><span className="workspace-sidebar-label">YOUR WORKSPACE</span><Link className="workspace-nav-item" href="/workspace"><span>▦</span> Overview</Link><Link className="workspace-nav-item" href="/workspace/websites"><span>◇</span> Websites</Link><Link className="workspace-nav-item" href="/workspace/domains"><span>⌘</span> Domains</Link><Link className="workspace-nav-item workspace-nav-active" href="/workspace/team"><span>♙</span> Team &amp; access</Link><Link className="workspace-nav-item" href="/billing"><span>◷</span> Billing</Link><Link className="workspace-nav-item" href="/support"><span>◎</span> Help &amp; support</Link><div className="workspace-sidebar-bottom"><span className="workspace-status-dot" /> LUCIA ID recognised</div></aside>
      <section className="workspace-main"><div className="workspace-heading"><div><span className="workspace-kicker">PEOPLE & PERMISSIONS</span><h1>Your people, clearly organised.</h1><p>See who belongs to each organisation and the role recorded for their access.</p></div><span className="workspace-live-pill"><span /> Live database view</span></div>
        <div className="workspace-metrics"><article className="workspace-metric"><span className="workspace-metric-label">Organisations you can manage</span><strong>{groups.length}</strong><span className="workspace-metric-foot">Memberships with member-read permission</span></article><article className="workspace-metric"><span className="workspace-metric-label">People in view</span><strong>{groups.reduce((sum, group) => sum + group.people.length, 0)}</strong><span className="workspace-metric-foot">Current membership records</span></article></div>
        {groups.length ? groups.map((group) => <section className="workspace-panel" key={group.id}><div className="workspace-panel-heading"><div><h2>{group.name}</h2><p>Your role: {group.role.replaceAll("_"," ")}</p></div><span className="workspace-count">{group.people.length} people</span></div><div className="workspace-org-list">{group.people.map((person) => <article className="workspace-org-card" key={person.id}><div className="workspace-org-avatar">{(person.displayName || "U").slice(0,1).toUpperCase()}</div><div className="workspace-org-info"><h3>{person.displayName || "LUCIA ID member"}</h3><p>{person.role.replaceAll("_"," ")} · Joined {person.joinedAt.toLocaleDateString()}</p></div><span className={`workspace-status ${person.status === "active" ? "workspace-status-success" : "workspace-status-neutral"}`}>{person.status}</span>{["owner","admin"].includes(group.role) ? <TeamMemberControls organizationId={group.id} membershipId={person.membershipId} memberName={person.displayName || "LUCIA ID member"} memberRole={person.role} memberStatus={person.status} actorRole={group.role} isSelf={person.id === user.id} /> : null}</article>)}</div></section>) : <section className="workspace-panel"><div className="workspace-empty"><span className="workspace-empty-icon">♙</span><h3>No organisation access to manage</h3><p>Only active organisations where your role includes member access appear here.</p></div></section>}
        <p className="workspace-footnote">This page is a live, read-only access directory. Inviting people, changing roles, and removing access are not exposed until their audited Core-authoritative workflow is connected.</p><Link className="workspace-back" href="/workspace">Back to overview</Link>
      </section>
    </div>
  </main>;
}
