const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate an organisation identifier before using it to establish a
 * database tenant scope. This is validation only, never authorization:
 * callers must verify the user's active membership in LUCIA OS's own database.
 * LUCIA Core authenticates identity only and is not consulted for membership.
 */
export function assertOrganizationId(value: unknown): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new Error("A valid organization ID is required.");
  }

  return value.toLowerCase();
}

/**
 * Build the parameter value for PostgreSQL set_config(
 * 'app.current_organization_id', value, true). Pass this value as a SQL
 * parameter inside a transaction; never interpolate it into SQL text.
 */
export function tenantSettingValue(organizationId: unknown): string {
  return assertOrganizationId(organizationId);
}
