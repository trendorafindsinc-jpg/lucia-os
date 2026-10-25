import "server-only";

import { and, eq } from "drizzle-orm";
import { getCurrentStaffUser, getOrganizationMembershipsForUser } from "@/lib/access/guards";
import { getDb } from "@/lib/db/client";
import { withOrganizationScope, withPlatformStaffScope } from "@/lib/db/tenant-scope";
import { supportCases } from "@/lib/db/schema";

const caseProjection = {
  id: supportCases.id,
  organizationId: supportCases.organizationId,
  subject: supportCases.subject,
  category: supportCases.category,
  priority: supportCases.priority,
  status: supportCases.status,
  createdAt: supportCases.createdAt,
  updatedAt: supportCases.updatedAt,
};

/**
 * Resolve a support case only inside an organisation the verified user belongs
 * to. Never perform an unscoped case-ID lookup before establishing RLS context.
 */
export async function findSupportCaseForUser(caseId: string, userId: string) {
  const memberships = await getOrganizationMembershipsForUser(userId);
  for (const membership of memberships) {
    const [supportCase] = await withOrganizationScope(membership.id, (tx) =>
      tx.select(caseProjection)
        .from(supportCases)
        .where(and(
          eq(supportCases.id, caseId),
          eq(supportCases.organizationId, membership.id),
        ))
        .limit(1),
    );
    if (supportCase) return supportCase;
  }
  return null;
}

/**
 * Platform staff case lookup. Permission is verified from the server-side
 * grant before setting the transaction-local staff context.
 */
export async function findSupportCaseForStaff(caseId: string, permission: string) {
  const staff = await getCurrentStaffUser(permission);
  if (!staff) return null;

  const [supportCase] = await withPlatformStaffScope(staff.id, (tx) =>
    tx.select(caseProjection)
      .from(supportCases)
      .where(eq(supportCases.id, caseId))
      .limit(1),
  );
  return supportCase ?? null;
}

export async function findSupportCaseUnscopedIsNotAllowed() {
  throw new Error("Support cases must be queried through an authorised tenant or staff scope.");
}
