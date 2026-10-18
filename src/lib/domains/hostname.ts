import { domainToASCII } from "node:url";

export const LUCIA_DOMAIN_ROOT = "lucia.name.ng";

const RESERVED_SUBDOMAINS = new Set([
  "www", "os", "admin", "api", "auth", "core", "mail", "support", "status",
  "app", "login", "signup", "static", "assets", "cdn", "docs", "help",
  "billing", "account", "accounts", "dashboard", "control", "tenant",
]);

export type WebsiteDomainType = "lucia_subdomain" | "custom";
export type WebsiteDomainStatus = "pending" | "verifying" | "verified" | "active" | "suspended" | "removed";

export function normalizeHostname(input: unknown): string {
  if (typeof input !== "string" || input.length > 300) throw new Error("Enter a valid domain name.");
  const trimmed = input.trim().replace(/\\.$/, "");
  if (!trimmed || /[\\s/:@?#\\\\]/.test(trimmed) || trimmed.includes("*")) {
    throw new Error("Enter a hostname only, without a URL, path, or wildcard.");
  }
  const ascii = domainToASCII(trimmed).toLowerCase();
  if (!ascii || ascii.length > 253 || ascii.split(".").some((label) =>
    label.length < 1 || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))) {
    throw new Error("Enter a valid domain name.");
  }
  return ascii;
}

export function classifyWebsiteHostname(input: unknown): { hostname: string; type: WebsiteDomainType; subdomain?: string } {
  const hostname = normalizeHostname(input);
  if (hostname === LUCIA_DOMAIN_ROOT || hostname.endsWith("." + LUCIA_DOMAIN_ROOT)) {
    const prefix = hostname === LUCIA_DOMAIN_ROOT ? "" : hostname.slice(0, -(("." + LUCIA_DOMAIN_ROOT).length));
    if (!prefix || prefix.includes(".")) throw new Error("Only one-level LUCIA subdomains are supported.");
    if (RESERVED_SUBDOMAINS.has(prefix)) throw new Error("That LUCIA subdomain is reserved.");
    if (!/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/.test(prefix)) {
      throw new Error("Choose a subdomain using 3–63 letters, numbers, or hyphens.");
    }
    return { hostname, type: "lucia_subdomain", subdomain: prefix };
  }
  return { hostname, type: "custom" };
}

/** Callers must pass a current entitlement verified server-side, never a client plan label. */
export function assertDomainClaimAllowed(input: { hostname: unknown; premiumEntitled: boolean }) {
  const result = classifyWebsiteHostname(input.hostname);
  if (result.type === "custom" && input.premiumEntitled !== true) {
    throw new Error("A current Premium entitlement is required to connect a custom domain.");
  }
  return result;
}

export function canActivateDomain(input: {
  status: WebsiteDomainStatus; type: WebsiteDomainType; premiumEntitled: boolean;
  ownershipVerified: boolean; pointsToExpectedDeployment: boolean; httpsReady: boolean;
}): boolean {
  if (input.status === "removed" || input.status === "suspended") return false;
  if (!input.ownershipVerified || !input.pointsToExpectedDeployment || !input.httpsReady) return false;
  if (input.type === "custom" && !input.premiumEntitled) return false;
  return true;
}

/** Never route unknown or non-active hostnames to a default tenant. */
export function isRoutableWebsiteDomain(input: { hostname: unknown; status: WebsiteDomainStatus; websiteStatus: string }): boolean {
  try { normalizeHostname(input.hostname); return input.status === "active" && input.websiteStatus === "published"; }
  catch { return false; }
}