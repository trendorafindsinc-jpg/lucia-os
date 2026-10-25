import "server-only";

import { and, eq, isNull, or, gt } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { staffGrants } from "@/lib/db/schema";
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
