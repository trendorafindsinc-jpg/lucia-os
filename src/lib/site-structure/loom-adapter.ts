import { loomBlueprintSchema, siteDraftToLoomBlueprint, type LoomBlueprint } from "@/lib/loom/blueprint";
import type { SiteDraft } from "@/lib/editor/site-draft";
import type { SiteStructure } from "./structure";

const sectionHeadings: Record<string, string> = {
  intro: "Introduction",
  features: "Features and services",
  testimonials: "What people say",
  gallery: "Selected work",
  faq: "Frequently asked questions",
};

function safeId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "section";
}

/** Build a safe, data-only Loom preview for the selected structured page. */
export function siteStructurePageToBlueprint(draft: SiteDraft, structure: SiteStructure, pageId: string): LoomBlueprint {
  const base = siteDraftToLoomBlueprint(draft);
  const page = structure.pages.find((candidate) => candidate.id === pageId)
    ?? structure.pages.find((candidate) => candidate.id === structure.homePageId)
    ?? structure.pages[0];
  if (!page) return base;

  const sections = page.sectionTypes.map((type, index) => {
    const id = safeId(`section-${index + 1}-${type}`);
    if (type === "hero") {
      return {
        id,
        type: "hero" as const,
        eyebrow: page.title,
        heading: draft.headline,
        body: draft.description,
        actionLabel: draft.buttonLabel,
        actionHref: "#contact" as const,
      };
    }
    if (type === "call-to-action") {
      return {
        id,
        type: "call-to-action" as const,
        heading: "Ready to take the next step?",
        body: draft.description,
        actionLabel: draft.buttonLabel,
        actionHref: "#contact" as const,
      };
    }
    if (type === "contact") {
      return { id, type: "contact" as const, heading: "Get in touch", body: draft.description };
    }
    return {
      id,
      type: "content-grid" as const,
      heading: sectionHeadings[type] ?? type,
      items: [{ title: page.title, body: draft.description }],
    };
  });

  if (!sections.length) sections.push(base.pages[0].sections[0]);
  const navigation = structure.navigationPageIds
    .map((id) => structure.pages.find((candidate) => candidate.id === id))
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
    .map((candidate) => ({ label: candidate.title, href: "#top" }));
  return loomBlueprintSchema.parse({
    ...base,
    navigation,
    pages: [{ id: safeId(page.id), path: page.slug ? `/${page.slug}` : "/", title: page.title, sections }],
  });
}
