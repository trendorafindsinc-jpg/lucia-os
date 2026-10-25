import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrganizationMembershipsForUser } from "@/lib/access/guards";
import { SupportWorkspace } from "@/components/support/support-workspace";

export const metadata = { title: "Help & support | LUCIA OS" };

export default async function SupportPage() {
  const user = await getCurrentUser();
  if (!user) return <main className="workspace-shell"><section className="workspace-card workspace-denied"><span className="workspace-kicker">HELP & SUPPORT</span><h1>Sign in to get support.</h1><p>Support cases are connected to an organisation you belong to.</p><Link className="workspace-button workspace-button-primary" href="/api/auth/login">Sign in with LUCIA ID</Link></section></main>;
  const orgs = await getOrganizationMembershipsForUser(user.id);
  return <SupportWorkspace organisations={orgs} />;
}
