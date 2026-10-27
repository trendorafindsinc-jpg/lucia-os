import Link from "next/link";
import { eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrganizationMembershipsForUser } from "@/lib/access/guards";
import { getDb } from "@/lib/db/client";
import { websites as websiteTable } from "@/lib/db/schema";
import { LoomifyAIWorkspace } from "@/components/loomify-ai/loomify-ai-workspace";
import "./loomify-ai.css";

export const metadata = { title: "loomifyAI · LUCIA OS" };

export default async function LoomifyAIPage({ searchParams }: { searchParams: Promise<{ websiteId?: string | string[] }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return <main className="loomify-workspace"><section className="loomify-workspace-panel"><h1>Sign in to use loomifyAI.</h1><p>Your website access is verified before any proposal is generated.</p><Link href="/api/auth/login?returnTo=%2Floomify-ai">Sign in with LUCIA ID</Link></section></main>;
  }

  const db = getDb();
  const organizations = await getOrganizationMembershipsForUser(user.id);
  const grouped = await Promise.all(organizations.map(async (organization) => db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_organization_id', ${organization.id}, true)`);
    return tx.select({ id: websiteTable.id, name: websiteTable.name })
      .from(websiteTable).where(eq(websiteTable.organizationId, organization.id));
  })));
  const options = grouped.flat().map((website) => ({ id: website.id, name: website.name }));
  const params = await searchParams;
  const requestedWebsiteId = Array.isArray(params.websiteId) ? params.websiteId[0] : params.websiteId;
  const initialWebsiteId = requestedWebsiteId && options.some((website) => website.id === requestedWebsiteId) ? requestedWebsiteId : "";
  return <LoomifyAIWorkspace websites={options} initialWebsiteId={initialWebsiteId} />;
}
