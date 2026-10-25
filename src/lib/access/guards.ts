import "server-only";

import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { memberships, organizations, staffGrants } from "@/lib/db/schema";
import { assertOrganizationId } from "@/lib/tenancy/tenant-context";
import { withUserScope } from "@/lib/db/tenant-scope";
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

/**
 * Resolve active organisation memberships with transaction-local context from
 * the verified local session user. Never pass a user ID supplied by a request.
 */
export async function getOrganizationMembershipsForUser(userId: string) {
  return withUserScope(userId, async (tx) =>
    tx.select({
      id: organizations.id,
      name: organizations.name,
      role: memberships.role,
      membershipStatus: memberships.status,
    })
      .from(memberships)
      .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
      .where(and(
        eq(memberships.userId, userId),
        eq(memberships.status, "active"),
        eq(organizations.status, "active"),
      )),
  );
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

  const membership = await withUserScope(user.id, async (tx) => {
    const [row] = await tx
      .select({ organizationId: memberships.organizationId, role: memberships.role, status: memberships.status })
      .from(memberships)
      .where(and(
        eq(memberships.organizationId, organizationId),
        eq(memberships.userId, user.id),
        eq(memberships.status, "active"),
      ))
      .limit(1);
    return row ?? null;
  });

  if (!membership || !hasOrganizationPermission(membership, permission)) return null;
  return { user, membership };
}
