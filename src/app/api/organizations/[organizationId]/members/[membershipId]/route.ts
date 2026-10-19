import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { appUsers, memberships, platformAuditEvents } from "@/lib/db/schema";
import { hasOrganizationPermission } from "@/lib/access/policy";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ organizationId: string; membershipId: string }> };
const inputSchema = z.object({
  role: z.enum(["admin", "editor", "viewer"]).optional(),
  status: z.enum(["active", "revoked"]).optional(),
}).refine((value) => value.role !== undefined || value.status !== undefined, "Provide a role or access status.");

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { organizationId, membershipId } = await context.params;
  if (!z.string().uuid().safeParse(organizationId).success || !z.string().uuid().safeParse(membershipId).success) {
    return NextResponse.json({ error: "Invalid organisation or membership id." }, { status: 400 });
  }
  let raw: unknown;
  try { raw = await request.json(); } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid role or access status.", issues: parsed.error.flatten() }, { status: 400 });

  const db = getDb();
  const [actor] = await db.select({ role: memberships.role, status: memberships.status })
    .from(memberships).where(and(eq(memberships.organizationId, organizationId), eq(memberships.userId, user.id), eq(memberships.status, "active"))).limit(1);
  if (!actor || !hasOrganizationPermission(actor, "members.manage")) {
    return NextResponse.json({ error: "You do not have permission to manage this organisation's members." }, { status: 403 });
  }
  if (parsed.data.role === "admin" && actor.role !== "owner") {
    return NextResponse.json({ error: "Only an organisation owner can grant administrator access." }, { status: 403 });
  }

  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_organization_id', ${organizationId}, true)`);
    const [target] = await tx.select({
      id: memberships.id,
      userId: memberships.userId,
      role: memberships.role,
      status: memberships.status,
      displayName: appUsers.displayName,
    }).from(memberships).innerJoin(appUsers, eq(memberships.userId, appUsers.id))
      .where(and(eq(memberships.id, membershipId), eq(memberships.organizationId, organizationId))).limit(1);
    if (!target) return { error: "Member not found in this organisation.", status: 404 as const };
    if (target.role === "owner") return { error: "Owner access cannot be changed here. Use the audited ownership-transfer workflow.", status: 409 as const };
    if (target.userId === user.id) return { error: "You cannot change or remove your own access from this screen.", status: 409 as const };
    if (actor.role !== "owner" && target.role === "admin") return { error: "Only an owner can manage another administrator.", status: 403 as const };

    const changes: { role?: string; status?: string; updatedAt: Date } = { updatedAt: new Date() };
    if (parsed.data.role !== undefined) changes.role = parsed.data.role;
    if (parsed.data.status !== undefined) changes.status = parsed.data.status;
    const [updated] = await tx.update(memberships).set(changes)
      .where(and(eq(memberships.id, membershipId), eq(memberships.organizationId, organizationId)))
      .returning({ id: memberships.id, role: memberships.role, status: memberships.status, updatedAt: memberships.updatedAt });
    await tx.insert(platformAuditEvents).values({
      actorUserId: user.id,
      actorKind: "tenant",
      organizationId,
      action: parsed.data.status === "revoked" ? "organization.member.access_revoked" : parsed.data.role ? "organization.member.role_changed" : "organization.member.access_restored",
      targetType: "organization_membership",
      targetId: membershipId,
      purpose: "Organisation member access management",
      result: "success",
      metadata: JSON.stringify({ previousRole: target.role, role: updated.role, status: updated.status }),
    });
    return { member: { ...updated, displayName: target.displayName } };
  });

  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ member: result.member });
}
