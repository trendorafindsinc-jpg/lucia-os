import "server-only";

import { and, eq, isNull, or, gt } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { loomMemberRestrictions, staffGrants } from "@/lib/db/schema";
import { hasStaffPermission } from "@/lib/access/policy";

export async function requireLoomStaff(permission: "loom.verify_business" | "loom.moderate") {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return { user: null, denied: "unauthenticated" as const };
  const db = getDb();
  const grants = await db.select({
    role: staffGrants.role,
    status: staffGrants.status,
    expiresAt: staffGrants.expiresAt,
  }).from(staffGrants).where(and(
    eq(staffGrants.userId, user.id),
    eq(staffGrants.status, "active"),
    or(isNull(staffGrants.expiresAt), gt(staffGrants.expiresAt, new Date())),
  ));
  if (!hasStaffPermission(grants, permission)) return { user, denied: "forbidden" as const };
  return { user, denied: null };
}

export async function getLoomRestriction(userId: string) {
  const [restriction] = await getDb().select({
    status: loomMemberRestrictions.status,
    reason: loomMemberRestrictions.reason,
    expiresAt: loomMemberRestrictions.expiresAt,
  }).from(loomMemberRestrictions).where(and(
    eq(loomMemberRestrictions.userId, userId),
    or(eq(loomMemberRestrictions.status, "restricted"), eq(loomMemberRestrictions.status, "banned")),
    or(isNull(loomMemberRestrictions.expiresAt), gt(loomMemberRestrictions.expiresAt, new Date())),
  )).limit(1);
  return restriction ?? null;
}
