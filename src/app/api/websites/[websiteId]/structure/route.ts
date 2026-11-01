import { ne, and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { hasOrganizationPermission } from "@/lib/access/policy";
import { getDb } from "@/lib/db/client";
import { memberships, organizations, websiteStructures, websites } from "@/lib/db/schema";
import { makeInitialStructure, siteStructureSchema } from "@/lib/site-structure/structure";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ websiteId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in with LUCIA ID to view page structure." }, { status: 401 });

  const { websiteId } = await context.params;
  if (!z.string().uuid().safeParse(websiteId).success) return NextResponse.json({ error: "Invalid website id." }, { status: 400 });
  const db = getDb();
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_user_id', ${user.id}, true)`);
    const orgs = await tx.select({
      id: organizations.id,
      role: memberships.role,
      membershipStatus: memberships.status,
    }).from(memberships)
      .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
      .where(and(eq(memberships.userId, user.id), eq(memberships.status, "active"), eq(organizations.status, "active")));

    for (const organization of orgs) {
      if (!hasOrganizationPermission({ role: organization.role, status: organization.membershipStatus }, "website.read")) continue;
      await tx.execute(sql`select set_config('app.current_organization_id', ${organization.id}, true)`);
      const [website] = await tx.select({ id: websites.id, organizationId: websites.organizationId })
        .from(websites)
        .where(and(eq(websites.id, websiteId), eq(websites.organizationId, organization.id), ne(websites.status, "deleted")))
        .limit(1);
      if (!website) continue;
      const [saved] = await tx.select({ structure: websiteStructures.structure })
        .from(websiteStructures)
        .where(and(eq(websiteStructures.organizationId, organization.id), eq(websiteStructures.websiteId, website.id)))
        .limit(1);
      return { websiteId: website.id, row: saved ?? null };
    }
    return null;
  });

  if (!result) return NextResponse.json({ error: "Website not found or access denied." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  if (!result.row) return NextResponse.json({ websiteId: result.websiteId, structure: makeInitialStructure(), saved: false }, { headers: { "Cache-Control": "no-store" } });
  let parsed: unknown;
  try { parsed = JSON.parse(result.row.structure); } catch {
    return NextResponse.json({ error: "The saved page structure is invalid and was not changed." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
  const checked = siteStructureSchema.safeParse(parsed);
  if (!checked.success) return NextResponse.json({ error: "The saved page structure failed validation and was not changed." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ websiteId: result.websiteId, structure: checked.data, saved: true }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in with LUCIA ID to save page structure." }, { status: 401 });

  const { websiteId } = await context.params;
  if (!z.string().uuid().safeParse(websiteId).success) return NextResponse.json({ error: "Invalid website id." }, { status: 400 });
  let raw: unknown;
  try { raw = await request.json(); } catch {
    return NextResponse.json({ error: "Submit valid page structure." }, { status: 400 });
  }
  const checked = siteStructureSchema.safeParse(raw);
  if (!checked.success) return NextResponse.json({ error: "Page structure is invalid.", issues: checked.error.flatten() }, { status: 422 });

  const db = getDb();
  const saved = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_user_id', ${user.id}, true)`);
    const orgs = await tx.select({
      id: organizations.id,
      role: memberships.role,
      membershipStatus: memberships.status,
    }).from(memberships)
      .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
      .where(and(eq(memberships.userId, user.id), eq(memberships.status, "active"), eq(organizations.status, "active")));

    for (const organization of orgs) {
      if (!hasOrganizationPermission({ role: organization.role, status: organization.membershipStatus }, "website.edit")) continue;
      await tx.execute(sql`select set_config('app.current_organization_id', ${organization.id}, true)`);
      const [website] = await tx.select({ id: websites.id, organizationId: websites.organizationId })
        .from(websites)
        .where(and(eq(websites.id, websiteId), eq(websites.organizationId, organization.id), ne(websites.status, "deleted")))
        .limit(1);
      if (!website) continue;
      await tx.insert(websiteStructures).values({
        organizationId: organization.id,
        websiteId: website.id,
        createdByUserId: user.id,
        structure: JSON.stringify(checked.data),
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: [websiteStructures.organizationId, websiteStructures.websiteId],
        set: { structure: JSON.stringify(checked.data), updatedAt: new Date() },
      });
      return website.id;
    }
    return null;
  });

  if (!saved) return NextResponse.json({ error: "Website not found or you do not have editing access." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ saved: true, websiteId: saved, savedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
