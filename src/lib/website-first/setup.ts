import { z } from "zod";
import { websiteGoals, organisationTypes, makeSiteSlug } from "@/lib/onboarding/website-setup";
import { isPremiumStartingLayout } from "@/lib/templates/starting-layouts";
import { createHash } from "node:crypto";

export const websiteFirstSetupSchema = z.object({
  kind: z.literal("website-first"),
  websiteName: z.string().trim().min(2).max(80),
  whatDoYouDo: z.string().trim().min(2).max(160),
  purpose: z.enum(websiteGoals),
  contact: z.string().trim().max(254).optional().default(""),
  style: z.enum(["No preference", "Modern", "Classic", "Bold", "Warm"]).optional().default("No preference"),
  layoutId: z.string().refine(isPremiumStartingLayout, "Choose one of the 48 registered Layouts"),
}).strict();
export type WebsiteFirstSetup = z.infer<typeof websiteFirstSetupSchema>;

export function deriveOrganizationType(description: string): (typeof organisationTypes)[number] {
  if (/school|academy|learn|educat|tutor/i.test(description)) return "School or education";
  if (/shop|store|retail|commerce|product/i.test(description)) return "Shop or product brand";
  if (/restaurant|cafe|hotel|hospitality|venue|event/i.test(description)) return "Hospitality or venue";
  if (/art|portfolio|creative|photo/i.test(description)) return "Portfolio or creative";
  if (/health|clinic|wellness|medical/i.test(description)) return "Health or wellness";
  if (/nonprofit|charity|community|church/i.test(description)) return "Community or nonprofit";
  return "Business or service";
}

/** Names and caller account are server-trusted; stable suffix prevents duplicate retries. */
export function deriveWebsiteSlug(name: string, accountId: string) {
  const base = makeSiteSlug(name).slice(0, 36).replace(/-+$/, "") || "website";
  const suffix = createHash("sha256").update(accountId + "\x00" + name.trim().toLowerCase()).digest("hex").slice(0, 10);
  return base + "-" + suffix;
}
