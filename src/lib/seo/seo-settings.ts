import { z } from "zod";

const secureUrl = z.string().trim().url().refine((value) => {
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}, "Use a complete HTTPS URL.");

export const seoSettingsSchema = z.object({
  pageName: z.string().trim().min(1).max(120),
  title: z.string().trim().max(70),
  description: z.string().trim().max(200),
  canonicalUrl: z.union([z.literal(""), secureUrl]),
  socialImageUrl: z.union([z.literal(""), secureUrl]),
  indexable: z.boolean(),
  followLinks: z.boolean(),
  socialTitle: z.string().trim().max(70),
  socialDescription: z.string().trim().max(200),
}).strict();

export type SeoSettings = z.infer<typeof seoSettingsSchema>;

export const defaultSeoSettings: SeoSettings = {
  pageName: "Home",
  title: "A better digital home for your organisation",
  description: "Create a professional website for your organisation with LUCIA OS. Choose a design, shape your pages, and grow at your own pace.",
  canonicalUrl: "",
  socialImageUrl: "",
  indexable: true,
  followLinks: true,
  socialTitle: "",
  socialDescription: "",
};

export type SeoCheck = { label: string; detail: string; status: "good" | "warning" | "error" };

export function getSeoChecks(settings: SeoSettings): SeoCheck[] {
  const titleLength = settings.title.trim().length;
  const descriptionLength = settings.description.trim().length;
  return [
    { label: "Search title", detail: titleLength >= 30 && titleLength <= 60 ? "Good length for a search result." : titleLength === 0 ? "Add a title to describe this page." : "Aim for about 30–60 characters.", status: titleLength === 0 ? "error" : titleLength >= 30 && titleLength <= 60 ? "good" : "warning" },
    { label: "Search description", detail: descriptionLength >= 120 && descriptionLength <= 160 ? "Good length for a search snippet." : descriptionLength === 0 ? "Add a clear summary for search engines." : "Aim for about 120–160 characters.", status: descriptionLength === 0 ? "error" : descriptionLength >= 120 && descriptionLength <= 160 ? "good" : "warning" },
    { label: "Canonical URL", detail: settings.canonicalUrl ? "An HTTPS canonical URL is configured." : "Add the final public URL when this site has a verified domain.", status: settings.canonicalUrl ? "good" : "warning" },
    { label: "Social sharing image", detail: settings.socialImageUrl ? "An HTTPS image URL is configured." : "Add a public social preview image (commonly 1200 × 630 px).", status: settings.socialImageUrl ? "good" : "warning" },
    { label: "Search visibility", detail: settings.indexable ? "This page is marked as eligible for indexing." : "This page is marked noindex; search engines should not list it.", status: settings.indexable ? "good" : "warning" },
  ];
}

export function buildPageMetadata(settings: SeoSettings) {
  const parsed = seoSettingsSchema.safeParse(settings);
  if (!parsed.success) throw new Error("Invalid SEO settings.");
  const data = parsed.data;
  return {
    title: data.title || data.pageName,
    description: data.description,
    ...(data.canonicalUrl ? { alternates: { canonical: data.canonicalUrl } } : {}),
    robots: { index: data.indexable, follow: data.followLinks },
    openGraph: {
      title: data.socialTitle || data.title || data.pageName,
      description: data.socialDescription || data.description,
      ...(data.canonicalUrl ? { url: data.canonicalUrl } : {}),
      ...(data.socialImageUrl ? { images: [{ url: data.socialImageUrl }] } : {}),
      type: "website" as const,
    },
    twitter: {
      card: data.socialImageUrl ? "summary_large_image" as const : "summary" as const,
      title: data.socialTitle || data.title || data.pageName,
      description: data.socialDescription || data.description,
      ...(data.socialImageUrl ? { images: [data.socialImageUrl] } : {}),
    },
  };
}
