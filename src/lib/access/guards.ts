import "server-only";

import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { memberships, staffGrants } from "@/lib/db/schema";
import { assertOrganizationId } from "@/lib/tenancy/tenant-context";
import { hasOrganizationPermission, hasStaffPermission } from "./policy";

/** Resolve staff grants from the database; never accept grants from request data. */
export async function getCurrentStaffUser(permission: string) {
  const user = await getCurrentUser();
  if (!user) return null;

  const db = getDb();
  const grants = await db
    .select({ role: staffGrants.role, status: staffGrants.status, expiresAt: staffGrants.expiresAt })
    .from(staffGrants)
    .where(and(eq(staffGrants.userId, user.id), eq(staffGrants.status, "active")));

  return hasStaffPermission(grants, permission) ? user : null;
}

/** Resolve active organisation membership server-side before tenant operations. */
export async function getCurrentOrganizationAccess(
  organizationIdInput: unknown,
  permission: string,
) {
  const user = await getCurrentUser();
  if (!user) return null;

  let organizationId: string;
  try {
    organizationId = assertOrganizationId(organizationIdInput);
  } catch {
    return null;
  }

  const db = getDb();
  const [membership] = await db
    .select({ organizationId: memberships.organizationId, role: memberships.role, status: memberships.status })
    .from(memberships)
    .where(and(
      eq(memberships.organizationId, organizationId),
      eq(memberships.userId, user.id),
      eq(memberships.status, "active"),
    ))
    .limit(1);

  if (!membership || !hasOrganizationPermission(membership, permission)) return null;
  return { user, membership };
}
