import { z } from "zod";

export const reusableSectionTypes = ["hero", "intro", "features", "testimonials", "gallery", "faq", "contact", "call-to-action"] as const;
export type ReusableSectionType = (typeof reusableSectionTypes)[number];

export const reusableSectionLibrary: ReadonlyArray<{ type: ReusableSectionType; label: string; description: string }> = [
  { type: "hero", label: "Hero", description: "A strong opening with a clear message." },
  { type: "intro", label: "Introduction", description: "Explain who you are and what you do." },
  { type: "features", label: "Features", description: "Highlight services, benefits or key offerings." },
  { type: "testimonials", label: "Testimonials", description: "Build trust with customer stories." },
  { type: "gallery", label: "Gallery", description: "Showcase projects, products or spaces." },
  { type: "faq", label: "Frequently asked questions", description: "Answer common visitor questions." },
  { type: "contact", label: "Contact", description: "Help visitors reach your organisation." },
  { type: "call-to-action", label: "Call to action", description: "Give visitors a clear next step." },
];

export const sitePageSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(1).max(60),
  slug: z.string().regex(/^(?:|[a-z0-9]+(?:-[a-z0-9]+)*)$/).max(60),
  sectionTypes: z.array(z.enum(reusableSectionTypes)).min(1).max(20),
});

export const siteStructureSchema = z.object({
  homePageId: z.string(),
  pages: z.array(sitePageSchema).min(1).max(50),
  navigationPageIds: z.array(z.string()).max(12),
}).superRefine((structure, ctx) => {
  const ids = structure.pages.map((page) => page.id);
  const slugs = structure.pages.map((page) => page.slug);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", path: ["pages"], message: "Page IDs must be unique." });
  if (new Set(slugs).size !== slugs.length) ctx.addIssue({ code: "custom", path: ["pages"], message: "Page addresses must be unique." });
  if (!ids.includes(structure.homePageId)) ctx.addIssue({ code: "custom", path: ["homePageId"], message: "Choose an existing homepage." });
  const homepage = structure.pages.find((page) => page.id === structure.homePageId);
  if (homepage && homepage.slug !== "") ctx.addIssue({ code: "custom", path: ["pages"], message: "The homepage must use the root address." });
  if (new Set(structure.navigationPageIds).size !== structure.navigationPageIds.length) ctx.addIssue({ code: "custom", path: ["navigationPageIds"], message: "Navigation items must be unique." });
  for (const id of structure.navigationPageIds) if (!ids.includes(id)) ctx.addIssue({ code: "custom", path: ["navigationPageIds"], message: "Navigation can only include existing pages." });
});

export type SitePage = z.infer<typeof sitePageSchema>;
export type SiteStructure = z.infer<typeof siteStructureSchema>;

export function makeInitialStructure(): SiteStructure {
  const pages: SitePage[] = [
    { id: "home", title: "Home", slug: "", sectionTypes: ["hero", "intro", "features", "call-to-action"] },
    { id: "about", title: "About", slug: "about", sectionTypes: ["intro", "gallery", "testimonials"] },
    { id: "services", title: "Services", slug: "services", sectionTypes: ["hero", "features", "faq"] },
    { id: "contact", title: "Contact", slug: "contact", sectionTypes: ["intro", "contact"] },
  ];
  return { homePageId: "home", pages, navigationPageIds: ["home", "about", "services", "contact"] };
}

export function makePageId(title: string): string {
  const base = title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
  return base || "new-page";
}

export function addPage(structure: SiteStructure, title: string): SiteStructure {
  const cleanTitle = title.trim().slice(0, 60);
  if (!cleanTitle || structure.pages.length >= 50) return structure;
  const base = makePageId(cleanTitle);
  let id = base;
  let suffix = 2;
  while (structure.pages.some((page) => page.id === id)) id = `${base}-${suffix++}`;
  const slugBase = id === "home" ? "page" : id;
  const page: SitePage = { id, title: cleanTitle, slug: slugBase, sectionTypes: ["hero", "intro", "call-to-action"] };
  return { ...structure, pages: [...structure.pages, page], navigationPageIds: structure.navigationPageIds.length < 12 ? [...structure.navigationPageIds, id] : structure.navigationPageIds };
}

export function setHomepage(structure: SiteStructure, pageId: string): SiteStructure {
  const nextHomepage = structure.pages.find((page) => page.id === pageId);
  if (!nextHomepage || pageId === structure.homePageId) return structure;
  const currentHomepage = structure.pages.find((page) => page.id === structure.homePageId);
  if (!currentHomepage) return structure;
  return {
    ...structure,
    homePageId: pageId,
    pages: structure.pages.map((page) =>
      page.id === currentHomepage.id
        ? { ...page, slug: nextHomepage.slug }
        : page.id === nextHomepage.id
          ? { ...page, slug: "" }
          : page,
    ),
  };
}

export function removePage(structure: SiteStructure, pageId: string): SiteStructure {
  if (structure.pages.length <= 1 || pageId === structure.homePageId) return structure;
  return { ...structure, pages: structure.pages.filter((page) => page.id !== pageId), navigationPageIds: structure.navigationPageIds.filter((id) => id !== pageId) };
}

export function toggleNavigationPage(structure: SiteStructure, pageId: string): SiteStructure {
  if (!structure.pages.some((page) => page.id === pageId)) return structure;
  const included = structure.navigationPageIds.includes(pageId);
  if (!included && structure.navigationPageIds.length >= 12) return structure;
  return { ...structure, navigationPageIds: included ? structure.navigationPageIds.filter((id) => id !== pageId) : [...structure.navigationPageIds, pageId] };
}

export function addReusableSection(page: SitePage, type: ReusableSectionType): SitePage {
  if (page.sectionTypes.length >= 20) return page;
  return { ...page, sectionTypes: [...page.sectionTypes, type] };
}

export function moveReusableSection(sectionTypes: readonly ReusableSectionType[], index: number, direction: -1 | 1): ReusableSectionType[] {
  const nextIndex = index + direction;
  if (index < 0 || index >= sectionTypes.length || nextIndex < 0 || nextIndex >= sectionTypes.length) return [...sectionTypes];
  const result = [...sectionTypes];
  [result[index], result[nextIndex]] = [result[nextIndex], result[index]];
  return result;
}
