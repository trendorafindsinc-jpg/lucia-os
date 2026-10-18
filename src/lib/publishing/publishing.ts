import { z } from "zod";

export const customDomainSchema = z
  .string()
  .trim()
  .min(1, "Enter a domain name.")
  .max(253, "Domain names must be 253 characters or fewer.")
  .transform((value) => value.toLowerCase().replace(/\.$/, ""))
  .refine((value) => !value.includes("://") && !/[\s/:?#@]/.test(value), "Enter a hostname only, without a protocol, path, port or spaces.")
  .refine((value) => value.includes("."), "Enter a fully qualified domain, such as www.example.com.")
  .refine((value) => !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value), "IP addresses cannot be used as custom domains.")
  .refine((value) => !/(?:^|\.)(?:localhost|local|test|example|invalid)$/i.test(value), "Use a real registered domain, not a reserved test domain.")
  .refine(
    (value) => value.split(".").every((label) => label.length >= 1 && label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)),
    "Check the domain labels. Each label must use letters, numbers or internal hyphens.",
  );

export const publishSettingsSchema = z.object({
  siteName: z.string().trim().min(2).max(80),
  headline: z.string().trim().min(2).max(100),
  description: z.string().trim().min(10).max(220),
  siteSlug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(3).max(48),
  customDomain: z.string().trim().max(253).refine(
    (value) => value.length === 0 || customDomainSchema.safeParse(value).success,
    "Enter a valid custom domain hostname.",
  ),
});

export type PublishSettings = z.infer<typeof publishSettingsSchema>;

export type PublishCheck = {
  id: string;
  label: string;
  detail: string;
  ready: boolean;
};

export function getPublishChecks(settings: PublishSettings): PublishCheck[] {
  const domain = settings.customDomain ? customDomainSchema.safeParse(settings.customDomain) : null;
  return [
    { id: "content", label: "Website content", detail: settings.siteName.trim() && settings.headline.trim() && settings.description.trim() ? "Basic site copy is present." : "Add a site name, headline and description.", ready: Boolean(settings.siteName.trim() && settings.headline.trim() && settings.description.trim()) },
    { id: "slug", label: "LUCIA website address", detail: /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(settings.siteSlug) && settings.siteSlug.length >= 3 ? `Address candidate: ${settings.siteSlug}.lucia.site (availability not checked).` : "Choose a valid address slug.", ready: /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(settings.siteSlug) && settings.siteSlug.length >= 3 && settings.siteSlug.length <= 48 },
    { id: "domain", label: "Custom domain", detail: !settings.customDomain.trim() ? "Optional. Add a registered domain if you want to use one." : domain?.success ? `Hostname format is valid: ${domain.data}. Ownership and DNS are not verified.` : domain?.error.issues[0]?.message ?? "Enter a valid domain.", ready: !settings.customDomain.trim() || Boolean(domain?.success) },
    { id: "storage", label: "Saved website data", detail: "Not ready: durable tenant-isolated website storage is not connected to this workspace.", ready: false },
    { id: "access", label: "LUCIA Core authorization", detail: "Not ready: server-side publish permission and entitlement checks must be connected to the publish action.", ready: false },
    { id: "runtime", label: "Public website renderer", detail: "Not ready: public tenant routing and production rendering are not enabled.", ready: false },
    { id: "dns", label: "Domain verification and TLS", detail: "Not ready: DNS ownership checks and certificate provisioning are not configured.", ready: false },
  ];
}

export function getPublishReadiness(checks: readonly PublishCheck[]) {
  const readyCount = checks.filter((check) => check.ready).length;
  return { readyCount, total: checks.length, canPublish: checks.every((check) => check.ready) };
}
