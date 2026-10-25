import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrganizationMembershipsForUser } from "@/lib/access/guards";
import { hasOrganizationPermission } from "@/lib/access/policy";
import { getDb } from "@/lib/db/client";
import { websiteStructures, websites } from "@/lib/db/schema";
import { makeInitialStructure, siteStructureSchema } from "@/lib/site-structure/structure";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ websiteId: string }> };

async function findAuthorizedWebsite(websiteId: string, userId: string, permission: string) {
  const db = getDb();
  const organizations = await getOrganizationMembershipsForUser(userId);

  for (const organization of organizations) {
    if (!hasOrganizationPermission({ role: organization.role, status: organization.membershipStatus }, permission)) continue;
    const found = await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.current_organization_id', ${organization.id}, true)`);
      const [website] = await tx.select({ id: websites.id, organizationId: websites.organizationId })
        .from(websites)
        .where(and(eq(websites.id, websiteId), eq(websites.organizationId, organization.id)))
        .limit(1);
      return website ?? null;
    });
    if (found) return found;
  }
  return null;
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in with LUCIA ID to view page structure." }, { status: 401 });

  const { websiteId } = await context.params;
  if (!z.string().uuid().safeParse(websiteId).success) return NextResponse.json({ error: "Invalid website id." }, { status: 400 });
  const website = await findAuthorizedWebsite(websiteId, user.id, "website.read");
  if (!website) return NextResponse.json({ error: "Website not found or access denied." }, { status: 404 });

  const db = getDb();
  const row = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_organization_id', ${website.organizationId}, true)`);
    const [saved] = await tx.select({ structure: websiteStructures.structure })
      .from(websiteStructures)
      .where(and(eq(websiteStructures.organizationId, website.organizationId), eq(websiteStructures.websiteId, website.id)))
      .limit(1);
    return saved ?? null;
  });

  if (!row) return NextResponse.json({ websiteId: website.id, structure: makeInitialStructure(), saved: false }, { headers: { "Cache-Control": "no-store" } });
  let parsed: unknown;
  try { parsed = JSON.parse(row.structure); } catch {
    return NextResponse.json({ error: "The saved page structure is invalid and was not changed." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
  const checked = siteStructureSchema.safeParse(parsed);
  if (!checked.success) return NextResponse.json({ error: "The saved page structure failed validation and was not changed." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ websiteId: website.id, structure: checked.data, saved: true }, { headers: { "Cache-Control": "no-store" } });
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

  const website = await findAuthorizedWebsite(websiteId, user.id, "website.edit");
  if (!website) return NextResponse.json({ error: "Website not found or you do not have editing access." }, { status: 404 });

  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_organization_id', ${website.organizationId}, true)`);
    await tx.insert(websiteStructures).values({
      organizationId: website.organizationId,
      websiteId: website.id,
      createdByUserId: user.id,
      structure: JSON.stringify(checked.data),
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: [websiteStructures.organizationId, websiteStructures.websiteId],
      set: { structure: JSON.stringify(checked.data), updatedAt: new Date() },
    });
  });

  return NextResponse.json({ saved: true, websiteId: website.id, savedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
