import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { withUserScope } from "@/lib/db/tenant-scope";
import {
  memberships,
  organizations,
  workspacePreferences,
} from "@/lib/db/schema";
import {
  DEFAULT_PREFERENCES,
  preferencesSchema,
  type WorkspacePreferences,
} from "./preferences";

export async function readPreferences(userId: string) {
  return withUserScope(userId, async (tx) => {
    const [row] = await tx
      .select()
      .from(workspacePreferences)
      .where(eq(workspacePreferences.userId, userId))
      .limit(1);
    return {
      preferences: row
        ? preferencesSchema.parse(row.preferences)
        : DEFAULT_PREFERENCES,
      revision: row?.revision ?? 0,
    };
  });
}
/** Compare-and-swap protects both first insert and updates against stale clients. */
export async function savePreferences(
  userId: string,
  preferences: WorkspacePreferences,
  revision: number,
) {
  return withUserScope(userId, async (tx) => {
    if (preferences.preferredOrganizationId) {
      const [member] = await tx
        .select({ id: memberships.id })
        .from(memberships)
        .innerJoin(
          organizations,
          eq(organizations.id, memberships.organizationId),
        )
        .where(
          and(
            eq(memberships.userId, userId),
            eq(memberships.organizationId, preferences.preferredOrganizationId),
            eq(memberships.status, "active"),
            eq(organizations.status, "active"),
          ),
        )
        .limit(1);
      if (!member)
        return {
          error: "Organisation access is no longer available.",
          status: 403,
        } as const;
    }
    const rows =
      revision === 0
        ? await tx
            .insert(workspacePreferences)
            .values({ userId, preferences, revision: 1 })
            .onConflictDoNothing()
            .returning()
        : await tx
            .update(workspacePreferences)
            .set({
              preferences,
              revision: sql`${workspacePreferences.revision}+1`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(workspacePreferences.userId, userId),
                eq(workspacePreferences.revision, revision),
              ),
            )
            .returning();
    if (!rows.length)
      return {
        error:
          "Settings changed in another tab or device. Reload saved settings before trying again.",
        status: 409,
      } as const;
    return { preferences: rows[0].preferences, revision: rows[0].revision };
  });
}
