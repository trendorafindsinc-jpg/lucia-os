import type { Route } from "next";
import { getTemplateById, websiteTemplates, type TemplateCategory, type WebsiteTemplate } from "./catalogue";
import { premiumCandidate, premiumCandidateIds } from "@/lib/layout-blueprint/premium-layouts/catalogue-candidates";

/** Metadata adapter over the existing registries, not a second design registry. */
export const isPremiumStartingLayout = (id: string) => premiumCandidateIds.includes(id);
const categories: Record<string, TemplateCategory> = {
  "Business & Professional Services": "Business", "Portfolio & Creative": "Portfolio",
  "Hospitality & Lifestyle": "Hospitality", "Education & Learning": "Education",
  "Commerce & Product Showcases": "Storefront", "Technology & Digital Products": "Business",
  "Community, Nonprofit & Personal": "Community", "Property, Health & Local Services": "Wellness",
};
export function getStartingLayoutById(id: string): WebsiteTemplate | undefined {
  const legacy = getTemplateById(id);
  if (legacy) return legacy;
  if (!isPremiumStartingLayout(id)) return undefined;
  const definition = premiumCandidate(id);
  const slug = id.slice("lucia.layout.".length);
  return {
    id, name: slug[0].toUpperCase() + slug.slice(1), category: categories[definition.category],
    audience: definition.category, description: definition.pages[0].description,
    style: "Multi-page design", colors: [definition.tokens.foreground, definition.tokens.accent, definition.tokens.background],
    sections: definition.pages.map((page) => page.path === "/" ? "Home" : page.title.split("—")[0].trim()),
  };
}
export const premiumStartingLayouts = premiumCandidateIds.map((id) => getStartingLayoutById(id)!);
export const startingWebsiteDesigns = [...websiteTemplates, ...premiumStartingLayouts];
export function getLayoutPreviewHref(id: string): Route {
  if (!isPremiumStartingLayout(id)) throw Error("Unknown Layout preview");
  return ("/templates/preview/" + id) as Route;
}
