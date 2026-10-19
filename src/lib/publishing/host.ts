export const reservedSiteSlugs = new Set([
  "www", "os", "api", "auth", "id", "core", "secure", "school", "admin",
  "app", "dashboard", "support", "status", "docs", "assets", "static", "cdn",
  "mail", "email", "billing", "account", "accounts", "login", "signup",
  "register", "help", "dev", "staging", "preview", "vercel",
]);
export function isReservedSiteSlug(slug: string): boolean {
  return reservedSiteSlugs.has(slug.trim().toLowerCase());
}
export function resolveLuciaSubdomain(hostHeader: string | null, configuredDomain: string): string | null {
  if (!hostHeader || !configuredDomain.trim()) return null;
  const hostname = hostHeader.trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
  const domain = configuredDomain.trim().toLowerCase().replace(/^\*\./, "").replace(/^\./, "").replace(/\.$/, "");
  if (!domain || hostname === domain || !hostname.endsWith("." + domain)) return null;
  const label = hostname.slice(0, -(domain.length + 1));
  if (!label || label.includes(".") || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)) return null;
  if (isReservedSiteSlug(label)) return null;
  return label;
}
