import { z } from "zod";
import { isReservedSiteSlug } from "./host";

export const customDomainSchema = z.string()
  .trim()
  .min(1, "Enter a domain name.")
  .max(253, "Domain names must be 253 characters or fewer.")
  .transform((value) => value.toLowerCase().replace(/\.$/, ""))
  .refine((value) => !value.includes("://") && !/[\s/:?#@]/.test(value), "Enter a hostname only, without a protocol, path, port or spaces.")
  .refine((value) => value.includes("."), "Enter a fully qualified domain, such as www.example.com.")
  .refine((value) => !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value), "IP addresses cannot be used as custom domains.")
  .refine((value) => !/(?:^|\.)(?:localhost|local|test|example|invalid)$/i.test(value), "Use a real registered domain, not a reserved test domain.")
  .refine((value) => value.split(".").every((label) => label.length >= 1 && label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)), "Check the domain labels. Each label must use letters, numbers or internal hyphens.");

export const publishSettingsSchema = z.object({
  siteName: z.string().trim().min(2).max(80),
  headline: z.string().trim().min(2).max(100),
  description: z.string().trim().min(10).max(220),
  siteSlug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(3).max(48)
    .refine((value) => !isReservedSiteSlug(value), "That address is reserved by LUCIA. Choose another name."),
  customDomain: z.string().trim().max(253).refine(
    (value) => value.length === 0 || customDomainSchema.safeParse(value).success,
    "Enter a valid custom domain hostname.",
  ),
});
export type PublishSettings = z.infer<typeof publishSettingsSchema>;
export type PublishCheck = { id: string; label: string; detail: string; ready: boolean; required?: boolean };

export function getPublishChecks(settings: PublishSettings): PublishCheck[] {
  const domain = settings.customDomain ? customDomainSchema.safeParse(settings.customDomain) : null;
  const contentReady = Boolean(settings.siteName.trim() && settings.headline.trim() && settings.description.trim());
  const slugReady = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(settings.siteSlug) &&
    settings.siteSlug.length >= 3 && settings.siteSlug.length <= 48 && !isReservedSiteSlug(settings.siteSlug);
  return [
    { id: "content", label: "Website content", detail: contentReady ? "Name, headline and description are ready to save." : "Add a site name, headline and description.", ready: contentReady },
    { id: "slug", label: "LUCIA website address", detail: slugReady ? "Address: " + settings.siteSlug + ".lucia.name.ng. Availability is checked by the server when publishing." : "Choose a valid, non-reserved address.", ready: slugReady },
    { id: "domain", label: "Custom domain activation (optional)", detail: !settings.customDomain.trim() ? "Not needed for your free LUCIA subdomain." : domain?.success ? "Format is valid. The separate one-time activation payment and DNS/TLS verification are still pending; this does not block your LUCIA subdomain." : domain?.error.issues[0]?.message ?? "Enter a valid domain.", ready: !settings.customDomain.trim() || Boolean(domain?.success), required: false },
    { id: "storage", label: "Saved website data", detail: "PostgreSQL stores the draft and a separate published snapshot; the server confirms database availability on save.", ready: true },
    { id: "access", label: "LUCIA ID and publish permission", detail: "The server checks the LUCIA OS session, active organisation membership and publish permission.", ready: true },
    { id: "runtime", label: "Public website renderer", detail: "Wildcard host routing serves only a published snapshot for the requested slug.", ready: true },
    { id: "dns", label: "LUCIA subdomain and HTTPS", detail: "The verified *.lucia.name.ng project domain is used for customer subdomains. Custom domains require separate activation and verification.", ready: true, required: false },
  ];
}
export function getPublishReadiness(checks: readonly PublishCheck[]) {
  const readyCount = checks.filter((check) => check.ready).length;
  return { readyCount, total: checks.length, canPublish: checks.every((check) => check.required === false || check.ready) };
}
