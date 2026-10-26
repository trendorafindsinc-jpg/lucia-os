import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrganizationMembershipsForUser } from "@/lib/access/guards";
import { withOrganizationScope } from "@/lib/db/tenant-scope";
import { websites } from "@/lib/db/schema";
import WorkspaceLauncher from "./workspace-launcher";

export const metadata = { title: "Workspace" };

export default async function OrganizationWorkspacePage() {
  const user = await getCurrentUser();
  if (!user) {
    return <main className="workspace-shell"><section className="workspace-card workspace-denied"><span className="workspace-kicker">YOUR WORKSPACE</span><h1>Sign in to continue.</h1><p>Sign in with LUCIA ID to open your workspace and the apps available to you.</p><Link className="workspace-button workspace-button-primary" href="/api/auth/login?returnTo=%2Fworkspace">Sign in with LUCIA ID</Link><Link className="workspace-back" href="/">Back to LUCIA OS</Link></section></main>;
  }

  // Keep the server-side membership lookup and tenant-scoped summary. The launcher
  // is navigation only; every destination continues to enforce its own access rules.
  const organizations = (await getOrganizationMembershipsForUser(user.id))
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  const websiteCounts = await Promise.all(organizations.map((organization) =>
    withOrganizationScope(organization.id, async (tx) => {
      const [summary] = await tx.select({ total: count() })
        .from(websites)
        .where(eq(websites.organizationId, organization.id));
      return summary.total;
    }),
  ));

  return <WorkspaceLauncher
    displayName={user.displayName || "LUCIA user"}
    organizationCount={organizations.length}
    websiteCount={websiteCounts.reduce((total, value) => total + value, 0)}
  />;
}
