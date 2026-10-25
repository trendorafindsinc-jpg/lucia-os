import { and, desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrganizationMembershipsForUser } from "@/lib/access/guards";
import { hasOrganizationPermission } from "@/lib/access/policy";
import { getDb } from "@/lib/db/client";
import { memberships, organizations, websiteVersions, websites } from "@/lib/db/schema";
import { websiteSnapshotSchema } from "@/lib/versions/version-history";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ websiteId: string }> };
const inputSchema = z.object({
  label: z.string().trim().min(1).max(80),
  notes: z.string().max(500).optional().default(""),
  snapshot: websiteSnapshotSchema,
}).strict();

async function locateWebsite(websiteId: string, userId: string, permission: string) {
  const db = getDb();
  const orgs = await getOrganizationMembershipsForUser(userId);
  for (const org of orgs) {
    if (!hasOrganizationPermission({ role: org.role, status: org.membershipStatus }, permission)) continue;
    const found = await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.current_user_id', ${userId}, true)`);
      const [membership] = await tx.select({ role: memberships.role, status: memberships.status })
        .from(memberships)
        .where(and(eq(memberships.organizationId, org.id), eq(memberships.userId, userId), eq(memberships.status, "active")))
        .limit(1);
      if (!membership || !hasOrganizationPermission({ role: membership.role, status: membership.status }, permission)) return null;
      await tx.execute(sql`select set_config('app.current_organization_id', ${org.id}, true)`);
      const [organization] = await tx.select({ status: organizations.status }).from(organizations).where(eq(organizations.id, org.id)).limit(1);
      if (!organization || organization.status !== "active") return null;
      const [website] = await tx.select({ id: websites.id, organizationId: websites.organizationId })
        .from(websites).where(and(eq(websites.id, websiteId), eq(websites.organizationId, org.id))).limit(1);
      return website ?? null;
    });
    if (found) return found;
  }
  return null;
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in with LUCIA ID to view versions." }, { status: 401 });
  const { websiteId } = await context.params;
  if (!z.string().uuid().safeParse(websiteId).success) return NextResponse.json({ error: "Invalid website id." }, { status: 400 });
  const website = await locateWebsite(websiteId, user.id, "website.read");
  if (!website) return NextResponse.json({ error: "Website not found or access denied." }, { status: 404 });
  const db = getDb();
  const rows = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_user_id', ${user.id}, true)`);
    const [membership] = await tx.select({ role: memberships.role, status: memberships.status })
      .from(memberships)
      .where(and(eq(memberships.organizationId, website.organizationId), eq(memberships.userId, user.id), eq(memberships.status, "active")))
      .limit(1);
    if (!membership || !hasOrganizationPermission({ role: membership.role, status: membership.status }, "website.read")) return null;
    await tx.execute(sql`select set_config('app.current_organization_id', ${website.organizationId}, true)`);
    const [organization] = await tx.select({ status: organizations.status }).from(organizations).where(eq(organizations.id, website.organizationId)).limit(1);
    if (!organization || organization.status !== "active") return null;
    return tx.select().from(websiteVersions)
      .where(and(eq(websiteVersions.websiteId, website.id), eq(websiteVersions.organizationId, website.organizationId)))
      .orderBy(desc(websiteVersions.createdAt)).limit(25);
  });
  if (!rows) return NextResponse.json({ error: "Website not found or access denied." }, { status: 404 });
  const versions = rows.flatMap((row) => {
    try {
      const snapshot = websiteSnapshotSchema.safeParse(JSON.parse(row.snapshot));
      return snapshot.success ? [{ id: row.id, label: row.label, notes: row.notes, createdAt: row.createdAt.toISOString(), snapshot: snapshot.data }] : [];
    } catch { return []; }
  });
  return NextResponse.json({ versions }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in with LUCIA ID to save a version." }, { status: 401 });
  const { websiteId } = await context.params;
  if (!z.string().uuid().safeParse(websiteId).success) return NextResponse.json({ error: "Invalid website id." }, { status: 400 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Submit valid version data." }, { status: 400 }); }
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Version data is invalid.", issues: parsed.error.flatten() }, { status: 422 });
  const website = await locateWebsite(websiteId, user.id, "website.edit");
  if (!website) return NextResponse.json({ error: "Website not found or you do not have editing access." }, { status: 404 });
  const db = getDb();
  const created = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_user_id', ${user.id}, true)`);
    const [membership] = await tx.select({ role: memberships.role, status: memberships.status })
      .from(memberships)
      .where(and(eq(memberships.organizationId, website.organizationId), eq(memberships.userId, user.id), eq(memberships.status, "active")))
      .limit(1);
    if (!membership || !hasOrganizationPermission({ role: membership.role, status: membership.status }, "website.edit")) return null;
    await tx.execute(sql`select set_config('app.current_organization_id', ${website.organizationId}, true)`);
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${website.id}))`);
    const [row] = await tx.insert(websiteVersions).values({
      organizationId: website.organizationId, websiteId: website.id, createdByUserId: user.id,
      label: parsed.data.label, notes: parsed.data.notes, snapshot: JSON.stringify(parsed.data.snapshot),
    }).returning({ id: websiteVersions.id, createdAt: websiteVersions.createdAt });
    const all = await tx.select({ id: websiteVersions.id }).from(websiteVersions)
      .where(and(eq(websiteVersions.organizationId, website.organizationId), eq(websiteVersions.websiteId, website.id)))
      .orderBy(desc(websiteVersions.createdAt));
    for (const old of all.slice(25)) {
      await tx.delete(websiteVersions).where(and(eq(websiteVersions.id, old.id), eq(websiteVersions.organizationId, website.organizationId)));
    }
    return row;
  });
  if (!created) return NextResponse.json({ error: "Website not found or editing access was revoked." }, { status: 404 });
  return NextResponse.json({ saved: true, id: created.id, createdAt: created.createdAt.toISOString() }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
