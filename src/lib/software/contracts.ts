/**
 * Phase 7 commerce domain contracts. NOT purchases, records, payment handlers or
 * client-side licences. Future server-only adapters must enforce every authority.
 */
export type SoftwareId = string;
export type SoftwareVersionId = string;
export type SoftwareLicenceId = string;
export type InstallationId = string;
export type DeploymentId = string;

export type FeatureDefinition = {
  id: string;
  defaultEnabled: boolean;
  configurable: boolean;
  requiredLicenceRight?: string;
};
export type ConfigurationField = { key: string; type: "boolean" | "text" | "integer" | "choice"; required?: boolean; maxLength?: number; allowedValues?: readonly string[] };
export type SoftwareProduct = {
  id: SoftwareId; name: string; description: string; category: string;
  versionIds: readonly SoftwareVersionId[];
  features: readonly FeatureDefinition[];
  branding: { logo: boolean; colors: boolean; name: boolean; customDomain: boolean };
  configurationSchemaRef: string;
  deployment: { websitePath: boolean; subdomain: boolean; standalone: boolean };
  licencePolicyRef: string;
  commercialization: readonly ("private-use" | "end-user-subscriptions" | "one-time-end-user-sales")[];
  maintenancePolicy: { defaultMonths: number; includedUpdates: "purchased-major-version" | "security-only" };
  infrastructure: readonly string[];
};
export type SoftwareVersion = {
  productId: SoftwareId; id: SoftwareVersionId; number: string;
  compatibility: { minRuntime: string; supportedPlatforms: readonly string[] };
  features: readonly string[];
  configurationSchemaRef: string; migrationRequired: boolean;
  migrationPolicyRef?: string; releaseStatus: "draft" | "released" | "withdrawn";
  security: { advisoryRef?: string; patchChannel: string; maintenancePolicyRef: string };
};
export type CustomerInstallation = {
  id: InstallationId; tenantId: string; productId: SoftwareId; versionId: SoftwareVersionId;
  state: "requested" | "configuring" | "active" | "suspended" | "retired";
  enabledFeatures: readonly string[];
  brandingConfig: Readonly<Record<string, string>>;
  deploymentConfig: Readonly<Record<string, string>>;
  licenceId: SoftwareLicenceId;
  authorizationScope: { tenantId: string; permission: string };
};
export type CustomerDeployment = {
  id: DeploymentId; installationId: InstallationId; tenantId: string;
  verifiedWebsiteId: string; relativePath: string;
  versionId: SoftwareVersionId;
  state: "requested" | "reserved" | "activating" | "active" | "failed" | "rolled-back";
  routeReservationId?: string; rollbackRef?: string;
};
/** Customer-owned billing belongs to a distinct financial relationship from LUCIA sales. */
export type CustomerMonetization = {
  ownerTenantId: string; installationId: InstallationId;
  ownerSubscriptionProducts: readonly { id: string; name: string }[];
  endUserPlans: readonly { id: string; productId: string; interval: "monthly" | "yearly" }[];
  endUserAccess: readonly { accountId: string; planId: string; entitlementId: string }[];
  paymentProviderConnectionRef?: string; // server-only opaque reference, NEVER credentials
  billingEventRefs: readonly string[]; webhookEventRefs: readonly string[];
  revenueLedgerRefs: readonly string[]; settlementRefs: readonly string[];
};
export type SoftwareLicence = {
  id: SoftwareLicenceId; tenantId: string; productId: SoftwareId; versionId: SoftwareVersionId;
  status: "pending" | "active" | "suspended" | "revoked";
  rights: { use: boolean; branding: boolean; subscriptionMonetization: boolean; resale: boolean };
  maintenanceStartsAt: string; maintenanceEndsAt: string;
  includedMajorVersionIds: readonly SoftwareVersionId[];
  entitlementRef: string; reconciliationRef?: string; revocationReason?: string;
};

const IDENTIFIER = /^[a-z][a-z0-9-]{1,63}$/;
const VERSION = /^[0-9]+[.][0-9]+[.][0-9]+(?:-[a-z0-9.-]+)?$/;
export function isSoftwareIdentifier(input: unknown): input is string {
  return typeof input === "string" && IDENTIFIER.test(input);
}
export function isSoftwareVersion(version: SoftwareVersion): boolean {
  return isSoftwareIdentifier(version.productId) &&
    isSoftwareIdentifier(version.id) && VERSION.test(version.number) &&
    version.id.startsWith(version.productId + "-") &&
    version.compatibility.supportedPlatforms.length > 0 &&
    Boolean(version.configurationSchemaRef && version.security.maintenancePolicyRef) &&
    (!version.migrationRequired || Boolean(version.migrationPolicyRef));
}

export function validateFeatureConfiguration(schema: readonly ConfigurationField[], input: unknown): boolean {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const record = input as Record<string, unknown>;
  const unique = new Set(schema.map(field => field.key));
  if (unique.size !== schema.length || Object.keys(record).some(key => !unique.has(key))) return false;
  return schema.every(field => {
    if (!/^[a-z][a-zA-Z0-9_]{0,63}$/.test(field.key)) return false;
    const value = record[field.key];
    if (value === undefined) return !field.required;
    if (field.type === "boolean") return typeof value === "boolean";
    if (field.type === "integer") return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
    if (field.type === "text") return typeof value === "string" && value.length <= (field.maxLength ?? 1000) && !/[\u0000-\u001f]/.test(value);
    return typeof value === "string" && Boolean(field.allowedValues?.includes(value));
  });
}

const RESERVED_ROOTS = new Set([
  "api","auth","login","logout","callback","oauth","_next","admin","staff","internal",
  "workspace","editor","create","templates","layouts","pages","content","publish",
  "billing","analytics","forms","seo","versions","support","settings","store",
  "loom","loomify-ai","robots.txt","sitemap.xml",".well-known","favicon.ico"
]);
export type DeploymentPathResult = { ok: true; path: string } | { ok: false; reason: "invalid" | "reserved" | "conflict" };
/**
 * Pure preflight only. Activation in later phases MUST atomically reserve a path
 * against verified, tenant-authorized website routes and published content.
 */
export function validateDeploymentPath(input: unknown, existingRoutes: readonly string[] = []): DeploymentPathResult {
  if (typeof input !== "string" || input.length < 2 || input.length > 160) return {ok:false,reason:"invalid"};
  if (input.includes("%") || input.includes("\\") || input.includes("?") || input.includes("#") || input.startsWith("//")) return {ok:false,reason:"invalid"};
  const path = input.toLowerCase().replace(/\/+$/, "");
  if (!/^\/[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*){0,2}$/.test(path)) return {ok:false,reason:"invalid"};
  const segments = path.slice(1).split("/");
  if (segments.some(segment => segment.length > 63)) return {ok:false,reason:"invalid"};
  if (RESERVED_ROOTS.has(segments[0])) return {ok:false,reason:"reserved"};
  for (const raw of existingRoutes) {
    if (typeof raw !== "string") return {ok:false,reason:"conflict"};
    const existing = raw.toLowerCase().replace(/\/+$/, "");
    if (path === existing || path.startsWith(existing + "/") || existing.startsWith(path + "/")) return {ok:false,reason:"conflict"};
  }
  return {ok:true,path};
}

export function licenceCoversVersion(licence: SoftwareLicence, versionId: string): boolean {
  return licence.status === "active" && licence.rights.use &&
    (licence.versionId === versionId || licence.includedMajorVersionIds.includes(versionId));
}
/** Maintenance finishing never revokes previously purchased version rights. */
export function hasMaintenanceCoverage(licence: SoftwareLicence, at: Date): boolean {
  const start = Date.parse(licence.maintenanceStartsAt);
  const end = Date.parse(licence.maintenanceEndsAt);
  return licence.status === "active" && Number.isFinite(start) && Number.isFinite(end) &&
    end > start && at.getTime() >= start && at.getTime() < end;
}
export function canMonetizeEndUserSubscriptions(licence: SoftwareLicence): boolean {
  return licence.status === "active" && licence.rights.use && licence.rights.subscriptionMonetization;
}
