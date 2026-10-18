import { z } from "zod";
import { websiteTemplates } from "@/lib/templates/catalogue";

export const websiteGoals = [
  "Introduce my organisation",
  "Get enquiries or bookings",
  "Showcase my work",
  "Share news and resources",
  "Present products for sale",
] as const;

export const organisationTypes = [
  "Business or service",
  "School or education",
  "Shop or product brand",
  "Portfolio or creative",
  "Community or nonprofit",
  "Hospitality or venue",
  "Health or wellness",
  "Other organisation",
] as const;

export const websiteSetupSchema = z.object({
  organisationName: z.string().trim().min(2, "Enter at least 2 characters.").max(80, "Use 80 characters or fewer."),
  websiteName: z.string().trim().min(2, "Enter at least 2 characters.").max(80, "Use 80 characters or fewer."),
  organisationType: z.enum(organisationTypes),
  goal: z.enum(websiteGoals),
  templateId: z.string().refine((id) => websiteTemplates.some((template) => template.id === id), "Choose a template from the catalogue."),
  country: z.string().trim().min(2).max(56),
  siteSlug: z.string().trim().min(3, "Use at least 3 characters.").max(48, "Use 48 characters or fewer.").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens."),
});

export type WebsiteSetup = z.infer<typeof websiteSetupSchema>;

export function makeSiteSlug(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48).replace(/-+$/g, "");
}
