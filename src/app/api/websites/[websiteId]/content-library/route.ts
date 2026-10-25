import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { hasOrganizationPermission } from "@/lib/access/policy";
import { getDb } from "@/lib/db/client";
import { memberships, organizations, websiteContentLibraries, websites } from "@/lib/db/schema";
import { contentLibrarySchema, makeEmptyLibrary } from "@/lib/content/content-library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ websiteId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in with LUCIA ID to view blog and media." }, { status: 401 });
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
      const [website] = await tx.select({ id: websites.id, organizationId: websites.organizationId })
        .from(websites).where(and(eq(websites.id, websiteId), eq(websites.organizationId, org.id))).limit(1);
      if (!website) continue;
      const [row] = await tx.select({ library: websiteContentLibraries.library })
        .from(websiteContentLibraries)
        .where(and(eq(websiteContentLibraries.organizationId, org.id), eq(websiteContentLibraries.websiteId, website.id))).limit(1);
      return { websiteId: website.id, library: row?.library ?? null };
    }
    return null;
  });
  if (!result) return NextResponse.json({ error: "Website not found or access denied." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  if (!result.library) return NextResponse.json({ websiteId: result.websiteId, library: makeEmptyLibrary(), saved: false }, { headers: { "Cache-Control": "no-store" } });
  let raw: unknown;
  try { raw = JSON.parse(result.library); } catch {
    return NextResponse.json({ error: "Saved content data is invalid and was not changed." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
  const checked = contentLibrarySchema.safeParse(raw);
  if (!checked.success) return NextResponse.json({ error: "Saved content data failed validation and was not changed." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ websiteId: result.websiteId, library: checked.data, saved: true }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in with LUCIA ID to save blog and media." }, { status: 401 });
  const { websiteId } = await context.params;
  if (!z.string().uuid().safeParse(websiteId).success) return NextResponse.json({ error: "Invalid website id." }, { status: 400 });
  let raw: unknown;
  try {
    const declaredLength = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(declaredLength) && declaredLength > 5_000_000) {
      return NextResponse.json({ error: "Content payload exceeds the 5 MB limit." }, { status: 413 });
    }
    const body = await request.text();
    if (body.length > 5_000_000) return NextResponse.json({ error: "Content payload exceeds the 5 MB limit." }, { status: 413 });
    raw = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Submit valid content data." }, { status: 400 });
  }
  const checked = contentLibrarySchema.safeParse(raw);
  if (!checked.success) return NextResponse.json({ error: "Content data is invalid.", issues: checked.error.flatten() }, { status: 422 });

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
        .from(websites).where(and(eq(websites.id, websiteId), eq(websites.organizationId, org.id))).limit(1);
      if (!website) continue;
      await tx.insert(websiteContentLibraries).values({
        organizationId: org.id, websiteId: website.id, createdByUserId: user.id,
        library: JSON.stringify(checked.data), updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: [websiteContentLibraries.organizationId, websiteContentLibraries.websiteId],
        set: { library: JSON.stringify(checked.data), updatedAt: new Date() },
      });
      return website.id;
    }
    return null;
  });
  if (!saved) return NextResponse.json({ error: "Website not found or you do not have editing access." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ saved: true, websiteId: saved, savedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
