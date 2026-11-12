import { ne, and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { hasOrganizationPermission } from "@/lib/access/policy";
import { getDb } from "@/lib/db/client";
import { memberships, organizations, websiteSeoSettings, websites } from "@/lib/db/schema";
import { defaultSeoSettings, seoSettingsSchema } from "@/lib/seo/seo-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ websiteId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in with LUCIA ID to view SEO settings." }, { status: 401 });
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
      const [website] = await tx.select({ id: websites.id })
        .from(websites).where(and(eq(websites.id, websiteId), eq(websites.organizationId, org.id), ne(websites.status, "deleted"))).limit(1);
      if (!website) continue;
      const [row] = await tx.select({ settings: websiteSeoSettings.settings })
        .from(websiteSeoSettings)
        .where(and(eq(websiteSeoSettings.organizationId, org.id), eq(websiteSeoSettings.websiteId, website.id))).limit(1);
      return { websiteId: website.id, settings: row?.settings ?? null };
    }
    return null;
  });
  if (!result) return NextResponse.json({ error: "Website not found or access denied." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  if (!result.settings) return NextResponse.json({ websiteId: result.websiteId, settings: defaultSeoSettings, saved: false }, { headers: { "Cache-Control": "no-store" } });
  let raw: unknown;
  try { raw = JSON.parse(result.settings); } catch {
    return NextResponse.json({ error: "Saved SEO settings are invalid and were not changed." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
  const checked = seoSettingsSchema.safeParse(raw);
  if (!checked.success) return NextResponse.json({ error: "Saved SEO settings failed validation and were not changed." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ websiteId: result.websiteId, settings: checked.data, saved: true }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in with LUCIA ID to save SEO settings." }, { status: 401 });
  const { websiteId } = await context.params;
  if (!z.string().uuid().safeParse(websiteId).success) return NextResponse.json({ error: "Invalid website id." }, { status: 400 });
  let raw: unknown;
  try { raw = await request.json(); } catch {
    return NextResponse.json({ error: "Submit valid SEO settings." }, { status: 400 });
  }
  const checked = seoSettingsSchema.safeParse(raw);
  if (!checked.success) return NextResponse.json({ error: "SEO settings are invalid.", issues: checked.error.flatten() }, { status: 422 });

  const db = getDb();
  const saved = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_user_id', ${user.id}, true)`);
    const orgs = await tx.select({ id: organizations.id, role: memberships.role, status: memberships.status })
      .from(memberships).innerJoin(organizations, eq(memberships.organizationId, organizations.id))
      .where(and(eq(memberships.userId, user.id), eq(memberships.status, "active"), eq(organizations.status, "active")));
    for (const org of orgs) {
      if (!hasOrganizationPermission({ role: org.role, status: org.status }, "website.edit")) continue;
      await tx.execute(sql`select set_config('app.current_organization_id', ${org.id}, true)`);
      const [website] = await tx.select({ id: websites.id })
        .from(websites).where(and(eq(websites.id, websiteId), eq(websites.organizationId, org.id), ne(websites.status, "deleted"))).limit(1);
      if (!website) continue;
      await tx.insert(websiteSeoSettings).values({
        organizationId: org.id, websiteId: website.id, createdByUserId: user.id,
        settings: JSON.stringify(checked.data), updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: [websiteSeoSettings.organizationId, websiteSeoSettings.websiteId],
        set: { settings: JSON.stringify(checked.data), updatedAt: new Date() },
      });
      return website.id;
    }
    return null;
  });
  if (!saved) return NextResponse.json({ error: "Website not found or you do not have editing access." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ saved: true, websiteId: saved, savedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
