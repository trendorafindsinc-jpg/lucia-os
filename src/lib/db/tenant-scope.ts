import "server-only";

import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type DatabaseTransaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

/**
 * Normalizes a tenant selector after the caller has resolved and authorized
 * the organization from trusted server-side membership state.
 *
 * This function validates shape only; a valid UUID is never proof of access.
 */
export function normalizeOrganizationId(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!UUID_PATTERN.test(normalized)) {
    throw new Error("Invalid organization identifier.");
  }
  return normalized;
}

/** Validate the local LUCIA OS user ID used only as transaction-local RLS context. */
export function normalizeUserId(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!UUID_PATTERN.test(normalized)) {
    throw new Error("Invalid user identifier.");
  }
  return normalized;
}

/**
 * Runs a query with transaction-local authenticated-user context.
 * This is a database filter, not authentication: callers must obtain userId
 * from the verified server-side session, never request data.
 */
export async function withUserScope<T>(
  userId: string,
  operation: (transaction: DatabaseTransaction) => Promise<T>,
): Promise<T> {
  const authenticatedUserId = normalizeUserId(userId);
  return getDb().transaction(async (transaction) => {
    await transaction.execute(
      sql`select set_config('app.current_user_id', ${authenticatedUserId}, true)`,
    );
    return operation(transaction);
  });
}

/**
 * Runs tenant queries in one transaction with transaction-local RLS context.
 * Callers MUST validate the authenticated session, active membership, and
 * action permission before calling this helper. Keep every tenant query in
 * the supplied transaction; do not use the global database handle inside it.
 */
export async function withOrganizationScope<T>(
  organizationId: string,
  operation: (transaction: DatabaseTransaction) => Promise<T>,
): Promise<T> {
  const authorizedOrganizationId = normalizeOrganizationId(organizationId);

  return getDb().transaction(async (transaction) => {
    await transaction.execute(
      sql`select set_config('app.current_organization_id', ${authorizedOrganizationId}, true)`,
    );
    return operation(transaction);
  });
}

/**
 * Runs a query with platform-staff RLS context. Call only after the server has
 * verified the user's active staff grant and the specific permission required
 * for this operation. This setting is not itself an authorization check.
 */
export async function withPlatformStaffScope<T>(
  userId: string,
  operation: (transaction: DatabaseTransaction) => Promise<T>,
): Promise<T> {
  const authenticatedUserId = normalizeUserId(userId);
  return getDb().transaction(async (transaction) => {
    await transaction.execute(
      sql`select set_config('app.current_user_id', ${authenticatedUserId}, true)`,
    );
    await transaction.execute(sql`select set_config('app.is_platform_staff', 'true', true)`);
    return operation(transaction);
  });
}
