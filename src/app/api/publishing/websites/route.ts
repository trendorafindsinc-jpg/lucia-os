import { and, eq, sql } from "drizzle-orm";
import { getOrganizationMembershipsForUser } from "@/lib/access/guards";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasOrganizationPermission } from "@/lib/access/policy";
import { getDb } from "@/lib/db/client";
import { memberships, websitePages, websites } from "@/lib/db/schema";
import { makeInitialDraft, siteDraftSchema } from "@/lib/editor/site-draft";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in with LUCIA ID to select a website." }, { status: 401, headers: { "Cache-Control": "no-store" } });

  let db: ReturnType<typeof getDb>;
  try { db = getDb(); } catch {
    return NextResponse.json({ error: "Website storage is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const orgs = await getOrganizationMembershipsForUser(user.id);
    const permitted = orgs.filter((org) => hasOrganizationPermission({ role: org.role, status: org.membershipStatus }, "website.publish"));
    const websitesForUser: Array<{ id: string; slug: string; name: string; status: string; headline: string; description: string }> = [];

    for (const org of permitted) {
      const found = await db.transaction(async (tx) => {
        await tx.execute(sql`select set_config('app.current_user_id', ${user.id}, true)`);
        const [membership] = await tx.select({ role: memberships.role, status: memberships.status })
          .from(memberships)
          .where(and(eq(memberships.organizationId, org.id), eq(memberships.userId, user.id), eq(memberships.status, "active")))
          .limit(1);
        if (!membership || !hasOrganizationPermission({ role: membership.role, status: membership.status }, "website.publish")) return [];
        await tx.execute(sql`select set_config('app.current_organization_id', ${org.id}, true)`);
        const rows = await tx.select({
          id: websites.id, slug: websites.slug, name: websites.name, status: websites.status,
        }).from(websites).where(eq(websites.organizationId, org.id));
        const results = [];
        for (const website of rows) {
          const [home] = await tx.select({ content: websitePages.content }).from(websitePages).where(and(
            eq(websitePages.organizationId, org.id), eq(websitePages.websiteId, website.id), eq(websitePages.path, "/"),
          )).limit(1);
          let draft = makeInitialDraft("northstar-consulting");
          if (home?.content) {
            try {
              const parsed = siteDraftSchema.safeParse(JSON.parse(home.content) as unknown);
              if (parsed.success) draft = parsed.data;
            } catch { /* Legacy plain text remains editable via the visual editor. */ }
          }
          results.push({
            id: website.id, slug: website.slug, name: website.name, status: website.status,
            headline: draft.headline, description: draft.description,
          });
        }
        return results;
      });
      websitesForUser.push(...found);
    }
    return NextResponse.json({ websites: websitesForUser }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "We couldn't load your saved websites. Please try again." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
