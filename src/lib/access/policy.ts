/**
 * Product-local access policy primitives.
 *
 * LUCIA Core authenticates the person; LUCIA OS authorizes what that person
 * may do here. Call these functions only with server-loaded database records,
 * never role/grant values supplied by the browser.
 */

export type StaffRole = "support_agent" | "support_lead" | "platform_operator" | "security_reviewer";
export type StaffGrantStatus = "active" | "suspended" | "revoked";

export interface StaffGrant {
  role: string;
  status: string;
  expiresAt: Date | null;
}

const staffPermissions: Record<StaffRole, ReadonlySet<string>> = {
  support_agent: new Set(["support.cases.read", "support.cases.reply", "support.cases.assign_self"]),
  support_lead: new Set(["support.cases.read", "support.cases.reply", "support.cases.assign_self", "support.cases.assign", "support.cases.resolve"]),
  platform_operator: new Set(["platform.overview.read", "tenants.read", "tenants.suspend", "support.cases.read", "support.cases.reply", "support.cases.assign", "support.cases.resolve"]),
  security_reviewer: new Set(["security.incidents.read", "audit.read", "staff.grants.read"]),
};

export function hasStaffPermission(
  grants: readonly StaffGrant[],
  permission: string,
  now: Date = new Date(),
): boolean {
  return grants.some((grant) => {
    if (grant.status !== "active" || !(Object.hasOwn(staffPermissions, grant.role))) return false;
    if (grant.expiresAt && grant.expiresAt.getTime() <= now.getTime()) return false;
    return staffPermissions[grant.role as StaffRole].has(permission);
  });
}

export type OrganizationRole = "owner" | "admin" | "editor" | "viewer";
export interface OrganizationMembership {
  role: string;
  status: string;
}

const organizationPermissions: Record<OrganizationRole, ReadonlySet<string>> = {
  owner: new Set([
    "organization.read", "organization.manage", "organization.delete",
    "members.read", "members.invite", "members.manage", "ownership.transfer",
    "website.read", "website.edit", "website.publish", "billing.read", "billing.manage",
    "support.case.create", "support.case.read",
  ]),
  admin: new Set([
    "organization.read", "organization.manage", "members.read", "members.invite", "members.manage",
    "website.read", "website.edit", "website.publish", "billing.read", "support.case.create", "support.case.read",
  ]),
  editor: new Set(["organization.read", "website.read", "website.edit", "support.case.create", "support.case.read"]),
  viewer: new Set(["organization.read", "website.read", "support.case.create", "support.case.read"]),
};

export function hasOrganizationPermission(
  membership: OrganizationMembership | null | undefined,
  permission: string,
): boolean {
  if (!membership || membership.status !== "active" || !(Object.hasOwn(organizationPermissions, membership.role))) return false;
  return organizationPermissions[membership.role as OrganizationRole].has(permission);
}

/** Platform privileges never derive from an organisation role. */
export function hasPlatformStaffAccess(
  grants: readonly StaffGrant[],
  now: Date = new Date(),
): boolean {
  return grants.some((grant) =>
    grant.status === "active" &&
    Object.hasOwn(staffPermissions, grant.role) &&
    (!grant.expiresAt || grant.expiresAt.getTime() > now.getTime()),
  );
}
