import { and, desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { hasOrganizationPermission } from "@/lib/access/policy";
import { getDb } from "@/lib/db/client";
import { memberships, organizations, websiteAnalyticsEvents, websites } from "@/lib/db/schema";
import { analyticsEventSchema, summarizeAnalytics } from "@/lib/analytics/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ websiteId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in with LUCIA ID to view analytics." }, { status: 401 });
  const { websiteId } = await context.params;
  if (!z.string().uuid().safeParse(websiteId).success) return NextResponse.json({ error: "Invalid website id." }, { status: 400 });

  const db = getDb();
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_user_id', ${user.id}, true)`);
    const orgs = await tx.select({ id: organizations.id, role: memberships.role, status: memberships.status })
      .from(memberships).innerJoin(organizations, eq(memberships.organizationId, organizations.id))
      .where(and(eq(memberships.userId, user.id), eq(memberships.status, "active"), eq(organizations.status, "active")));
    for (const org of orgs) {
      if (!hasOrganizationPermission({ role: org.role, status: org.status }, "website.read")) continue;
      await tx.execute(sql`select set_config('app.current_organization_id', ${org.id}, true)`);
      const [website] = await tx.select({ id: websites.id }).from(websites)
        .where(and(eq(websites.id, websiteId), eq(websites.organizationId, org.id))).limit(1);
      if (!website) continue;
      const rows = await tx.select().from(websiteAnalyticsEvents)
        .where(and(eq(websiteAnalyticsEvents.organizationId, org.id), eq(websiteAnalyticsEvents.websiteId, website.id)))
        .orderBy(desc(websiteAnalyticsEvents.occurredAt)).limit(1000);
      const events = rows.flatMap((row) => {
        const candidate = {
          id: `evt-${row.id.replace(/-/g, "")}`,
          tenantId: org.id,
          websiteId: website.id,
          sessionId: row.sessionHash,
          name: row.eventName,
          path: row.path,
          occurredAt: row.occurredAt.toISOString(),
          ...(row.conversionKey ? { conversionKey: row.conversionKey } : {}),
        };
        const checked = analyticsEventSchema.safeParse(candidate);
        return checked.success ? [checked.data] : [];
      });
      return { websiteId: website.id, events, summary: summarizeAnalytics(events), persistedEventCount: rows.length };
    }
    return null;
  });
  if (!result) return NextResponse.json({ error: "Website not found or access denied." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
