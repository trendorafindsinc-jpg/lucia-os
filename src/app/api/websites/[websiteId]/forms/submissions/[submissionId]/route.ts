import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { hasOrganizationPermission } from "@/lib/access/policy";
import { getDb } from "@/lib/db/client";
import { memberships, organizations, websiteFormSubmissions, websites } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ websiteId: string; submissionId: string }> };
const statusSchema = z.object({ status: z.enum(["new", "reviewed", "archived"]) }).strict();

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in with LUCIA ID to update submissions." }, { status: 401 });
  const { websiteId, submissionId } = await context.params;
  const rawId = submissionId.startsWith("submission-") ? submissionId.slice("submission-".length) : "";
  if (!z.string().uuid().safeParse(websiteId).success || !z.string().uuid().safeParse(rawId).success) {
    return NextResponse.json({ error: "Invalid website or submission id." }, { status: 400 });
  }
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Submit a valid submission status." }, { status: 400 }); }
  const parsed = statusSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid submission status." }, { status: 422 });

  const db = getDb();
  const updated = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_user_id', ${user.id}, true)`);
    const orgs = await tx.select({ id: organizations.id, role: memberships.role, status: memberships.status })
      .from(memberships).innerJoin(organizations, eq(memberships.organizationId, organizations.id))
      .where(and(eq(memberships.userId, user.id), eq(memberships.status, "active"), eq(organizations.status, "active")));
    for (const org of orgs) {
      if (!hasOrganizationPermission({ role: org.role, status: org.status }, "website.edit")) continue;
      await tx.execute(sql`select set_config('app.current_organization_id', ${org.id}, true)`);
      const [website] = await tx.select({ id: websites.id }).from(websites)
        .where(and(eq(websites.id, websiteId), eq(websites.organizationId, org.id))).limit(1);
      if (!website) continue;
      const [row] = await tx.update(websiteFormSubmissions).set({ status: parsed.data.status })
        .where(and(eq(websiteFormSubmissions.id, rawId), eq(websiteFormSubmissions.organizationId, org.id), eq(websiteFormSubmissions.websiteId, website.id)))
        .returning({ id: websiteFormSubmissions.id });
      return row?.id ?? null;
    }
    return null;
  });
  if (!updated) return NextResponse.json({ error: "Submission not found or you do not have editing access." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ updated: true, id: submissionId, status: parsed.data.status }, { headers: { "Cache-Control": "no-store" } });
}
