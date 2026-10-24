import { z } from "zod";
import { editorPalettes, type SiteDraft } from "@/lib/editor/site-draft";
import { getTemplateById } from "@/lib/templates/catalogue";

/**
 * Loom Blueprint v1 is the validated, versioned description of a website.
 * Keep this data-only: renderers own markup and must never evaluate user code.
 */
const safeText = (max: number) => z.string().trim().min(1).max(max);

export const loomSectionSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
    type: z.literal("hero"),
    eyebrow: safeText(100),
    heading: safeText(160),
    body: safeText(500),
    actionLabel: safeText(40),
    actionHref: z.literal("#contact"),
  }).strict(),
  z.object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
    type: z.literal("content-grid"),
    heading: safeText(120),
    items: z.array(z.object({
      title: safeText(100),
      body: safeText(300),
    }).strict()).min(1).max(12),
  }).strict(),
  z.object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
    type: z.literal("call-to-action"),
    heading: safeText(120),
    body: safeText(300),
    actionLabel: safeText(40),
    actionHref: z.literal("#contact"),
  }).strict(),
  z.object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
    type: z.literal("contact"),
    heading: safeText(120),
    body: safeText(300),
  }).strict(),
]);

export const loomPageSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
  path: z.string().regex(/^\/$|^\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/).max(180),
  title: safeText(120),
  sections: z.array(loomSectionSchema).min(1).max(24),
}).strict();

export const loomBlueprintSchema = z.object({
  schema: z.literal("lucia.loom-blueprint"),
  version: z.literal(1),
  site: z.object({
    name: safeText(80),
    description: safeText(500),
    seoTitle: safeText(70),
    seoDescription: safeText(160),
  }).strict(),
  theme: z.object({
    palette: z.enum(["original", "ocean", "forest", "sunset"]),
    colors: z.tuple([z.string().regex(/^#[0-9a-fA-F]{6}$/), z.string().regex(/^#[0-9a-fA-F]{6}$/), z.string().regex(/^#[0-9a-fA-F]{6}$/)]),
    layout: z.enum(["editorial", "split", "gallery", "cards", "storefront", "classic"]),
  }).strict(),
  navigation: z.array(z.object({
    label: safeText(50),
    href: z.string().regex(/^#[a-z0-9-]{1,64}$/),
  }).strict()).max(12),
  pages: z.array(loomPageSchema).min(1).max(30),
}).strict().superRefine((blueprint, ctx) => {
  const pagePaths = new Set<string>();
  for (const [index, page] of blueprint.pages.entries()) {
    if (pagePaths.has(page.path)) ctx.addIssue({ code: "custom", path: ["pages", index, "path"], message: "Page paths must be unique." });
    pagePaths.add(page.path);
    const sectionIds = new Set<string>();
    for (const [sectionIndex, section] of page.sections.entries()) {
      if (sectionIds.has(section.id)) ctx.addIssue({ code: "custom", path: ["pages", index, "sections", sectionIndex, "id"], message: "Section IDs must be unique within a page." });
      sectionIds.add(section.id);
    }
  }
});

export type LoomBlueprint = z.infer<typeof loomBlueprintSchema>;
export type LoomSection = z.infer<typeof loomSectionSchema>;

function slugify(value: string, fallback: string): string {
  const slug = value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64);
  return slug || fallback;
}

/** Backward-compatible adapter for existing saved SiteDraft records. */
export function siteDraftToLoomBlueprint(draft: SiteDraft): LoomBlueprint {
  const template = getTemplateById(draft.templateId);
  const palette = editorPalettes[draft.palette];
  const layout = template?.category === "Portfolio" || template?.category === "Creative"
    ? "gallery"
    : template?.category === "Storefront"
      ? "storefront"
      : template?.category === "Education" || template?.category === "Community"
        ? "cards"
        : template?.style.toLowerCase().includes("classic")
          ? "classic"
          : template?.style.toLowerCase().includes("modern") || template?.style.toLowerCase().includes("image")
            ? "split"
            : "editorial";
  const sections = draft.visibleSections.map((label, index) => ({
    id: slugify(label, `section-${index + 1}`),
    label,
    index,
  }));
  const hero = {
    id: "hero",
    type: "hero" as const,
    eyebrow: template?.category ?? "Website",
    heading: draft.headline,
    body: draft.description,
    actionLabel: draft.buttonLabel,
    actionHref: "#contact" as const,
  };
  const contentSections = sections.filter((section) => !/^(hero|intro|welcome)$/i.test(section.label));
  const contentGrid = contentSections.length ? [{
    id: "highlights",
    type: "content-grid" as const,
    heading: "Explore",
    items: contentSections.map((section) => ({
      title: section.label,
      body: section.index === 0 ? draft.description : `Discover more about ${section.label.toLowerCase()}.`,
    })),
  }] : [];
  const hasContact = sections.some((section) => /contact|enquir|book|apply|support/i.test(section.label));
  const contact = [{
    id: "contact",
    type: "contact" as const,
    heading: hasContact ? "Start a conversation" : draft.buttonLabel,
    body: hasContact ? "Reach out to learn more about our work and next steps." : draft.description,
  }];
  return loomBlueprintSchema.parse({
    schema: "lucia.loom-blueprint",
    version: 1,
    site: {
      name: draft.siteName,
      description: draft.description,
      seoTitle: draft.siteName.slice(0, 70),
      seoDescription: draft.description.slice(0, 160),
    },
    theme: { palette: draft.palette, colors: [...palette], layout },
    navigation: [
      ...(contentSections.length ? [{ label: "Explore", href: "#highlights" }] : []),
      { label: "Contact", href: "#contact" },
    ],
    pages: [{
      id: "home",
      path: "/",
      title: draft.siteName,
      sections: [hero, ...contentGrid, ...contact],
    }],
  });
}
