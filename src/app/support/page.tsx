import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { memberships, organizations } from "@/lib/db/schema";
import { SupportWorkspace } from "@/components/support/support-workspace";

export const metadata = { title: "Help & support | LUCIA OS" };

export default async function SupportPage() {
  const user = await getCurrentUser();
  if (!user) return <main className="workspace-shell"><section className="workspace-card workspace-denied"><span className="workspace-kicker">HELP & SUPPORT</span><h1>Sign in to get support.</h1><p>Support cases are connected to an organisation you belong to.</p><Link className="workspace-button workspace-button-primary" href="/api/auth/login">Sign in with LUCIA ID</Link></section></main>;
  const db = getDb();
  const orgs = await db.select({ id: organizations.id, name: organizations.name, role: memberships.role })
    .from(memberships).innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(and(eq(memberships.userId, user.id), eq(memberships.status, "active"), eq(organizations.status, "active")));
  return <SupportWorkspace organisations={orgs} />;
}
