import { visualExperienceSchema, supportedExpressions, type VisualExperience } from "./visual-experience";
import { z } from "zod";
import { mediaReferencePattern } from "@/lib/media/references";
import { premiumAssets } from "./premium-assets";

/**
 * Phase 13 additive contract. Legacy lucia.loom-blueprint v1 is deliberately
 * unchanged: persisted SiteDrafts must not be inferred to be v2.
 */
const id = z.string().regex(/^[a-z][a-z0-9-]{0,63}$/);
const text = (n: number) => z.string().trim().min(1).max(n);
export const premiumPathSchema = z
  .string()
  .max(180)
  .regex(/^\/$|^\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/);
const path = premiumPathSchema.refine(
  (value) =>
    !/^\/(?:api|workspace|staff|admin|auth|login|logout|site|tenant-site-internal|_next)(?:\/|$)/.test(
      value,
    ),
  "Reserved application path",
);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const asset = z
  .string()
  .max(160)
  .refine(
    (value) => Object.hasOwn(premiumAssets, value) || mediaReferencePattern.test(value),
    "Unknown built-in asset",
  );
const href = z
  .string()
  .max(180)
  .regex(/^(?:\/|\/[a-z0-9-]+(?:\/[a-z0-9-]+)*|#[a-z][a-z0-9-]*)$/);
const image = z.object({ src: asset, alt: text(200) }).strict();
const publicUrl = z.string().trim().max(350).url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password;
}, "Use a secure HTTPS address");
const businessProfileSchema = z.object({
  tagline: text(160).optional(),
  contactEmail: z.email().max(254).optional(),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,24}$/).optional(),
  address: text(240).optional(),
  serviceArea: text(160).optional(),
  enquiryEmail: z.email().max(254).optional(),
  social: z.object({
    instagram: publicUrl.optional(),
    facebook: publicUrl.optional(),
    linkedin: publicUrl.optional(),
    x: publicUrl.optional(),
  }).strict().optional(),
  logo: image.optional(),
}).strict();


const hero = z
  .object({
    id,
    type: z.literal("premium-hero"),
    variant: z.enum(["offset", "full-bleed", "typographic"]),
    eyebrow: text(100),
    heading: text(160),
    body: text(800),
    image: image.optional(),
    action: z
      .object({ label: text(50), href })
      .strict()
      .optional(),
  })
  .strict();
const trust = z
  .object({
    id,
    type: z.literal("trust-strip"),
    variant: z.enum(["inline", "stacked"]),
    items: z.array(text(100)).min(1).max(12),
  })
  .strict();
const editorial = z
  .object({
    id,
    type: z.literal("editorial-story"),
    variant: z.enum(["narrow", "split", "alternating"]),
    heading: text(150),
    body: text(3000),
    image: image.optional(),
  })
  .strict();
const gallery = z
  .object({
    id,
    type: z.literal("project-gallery"),
    variant: z.enum(["masonry", "rail", "grid"]),
    heading: text(150),
    projects: z
      .array(
        z
          .object({
            title: text(120),
            image,
            href: href.optional(),
            description: text(500).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(24),
  })
  .strict();
const services = z
  .object({
    id,
    type: z.literal("service-journey"),
    variant: z.enum(["chapters", "columns"]),
    heading: text(150),
    items: z
      .array(z.object({ title: text(120), body: text(500) }).strict())
      .min(1)
      .max(12),
  })
  .strict();
const experience = z
  .object({
    id,
    type: z.literal("experience"),
    variant: z.enum(["immersive", "editorial"]),
    heading: text(150),
    body: text(2000),
    image: image,
  })
  .strict();
const contact = z
  .object({
    id,
    type: z.literal("contact-panel"),
    variant: z.enum(["minimal", "split"]),
    heading: text(150),
    body: text(1000),
    email: z.string().email().max(254).optional(),
  })
  .strict();

/** Closed section registry: no customer-provided components or module paths. */
export const premiumSectionRegistry = {
  "premium-hero": hero,
  "trust-strip": trust,
  "editorial-story": editorial,
  "project-gallery": gallery,
  "service-journey": services,
  experience: experience,
  "contact-panel": contact,
} as const;
export const premiumSectionSchema = z.discriminatedUnion("type", [
  hero,
  trust,
  editorial,
  gallery,
  services,
  experience,
  contact,
]);
export type PremiumSection = z.infer<typeof premiumSectionSchema>;
export type PremiumSectionType = PremiumSection["type"];

export const premiumTokensSchema = z
  .object({
    background: color,
    foreground: color,
    accent: color,
    font: z.enum(["system-sans", "editorial-serif", "condensed-sans"]),
    scale: z.enum(["compact", "balanced", "expressive"]),
    width: z.enum(["reading", "standard", "wide"]),
    radius: z.enum(["square", "subtle", "rounded"]),
    rhythm: z.enum(["tight", "measured", "spacious"]),
    motion: z.enum(["none", "reduced"]),
  })
  .strict();

export const premiumPageSchema = z
  .object({
    id,
    path,
    title: text(120),
    description: text(160),
    navigation: z.boolean(),
    sections: z.array(premiumSectionSchema).min(1).max(24),
    responsive: z.enum(["stack", "asymmetric", "gallery"]).default("stack"),
  })
  .strict();

export const premiumLayoutSchema = z
  .object({
    schema: z.literal("lucia.layout-composition"),
    version: z.literal(2),
    layoutId: z.string().regex(/^lucia\.layout\.[a-z][a-z0-9-]{1,63}$/),
    layoutVersion: z.number().int().positive(),
    category: text(80),
    identity: z.object({
      name: text(80),
      description: text(500),
      profile: businessProfileSchema.optional(),
    }).strict(),
    tokens: premiumTokensSchema,
    visualExperience: visualExperienceSchema.optional(),
    navigation: z
      .array(z.object({ label: text(50), href: path }).strict())
      .max(12),
    pages: z.array(premiumPageSchema).min(1).max(30),
    permissions: z
      .object({
        guided: z
          .array(
            z.enum([
              "text",
              "image",
              "link",
              "brand",
              "contact",
              "reorder",
              "variant",
            ]),
          )
          .max(7),
        advanced: z
          .array(
            z.enum([
              "variant",
              "tokens",
              "section-order",
              "page-responsive",
              "section-structure",
              "pages",
            ]),
          )
          .max(6),
        lockedSections: z.array(id).max(100),
        visualExperienceLocked: z.boolean().optional(),
        lockedTokens: z
          .array(
            z.enum(["font", "scale", "width", "radius", "rhythm", "motion"]),
          )
          .max(6),
      })
      .strict(),
  })
  .strict()
  .superRefine((definition, ctx) => {
    if (definition.visualExperience && !supportedExpressions(definition.layoutId).includes(definition.visualExperience.expression)) ctx.addIssue({ code: "custom", path: ["visualExperience", "expression"], message: "This Layout does not support that expression." });
    const routes = new Set<string>(),
      pageIds = new Set<string>(),
      sectionIds = new Set<string>();
    for (const [i, p] of definition.pages.entries()) {
      if (routes.has(p.path))
        ctx.addIssue({
          code: "custom",
          path: ["pages", i, "path"],
          message: "Duplicate route",
        });
      if (pageIds.has(p.id))
        ctx.addIssue({
          code: "custom",
          path: ["pages", i, "id"],
          message: "Duplicate page ID",
        });
      routes.add(p.path);
      pageIds.add(p.id);
      const local = new Set<string>();
      for (const [j, s] of p.sections.entries()) {
        if (local.has(s.id) || sectionIds.has(s.id))
          ctx.addIssue({
            code: "custom",
            path: ["pages", i, "sections", j, "id"],
            message: "Duplicate section ID",
          });
        local.add(s.id);
        sectionIds.add(s.id);
        if (s.type === "premium-hero" && s.variant === "full-bleed" && !s.image)
          ctx.addIssue({
            code: "custom",
            path: ["pages", i, "sections", j, "image"],
            message: "Full-bleed hero requires an image",
          });
      }
    }
    if (!routes.has("/"))
      ctx.addIssue({
        code: "custom",
        path: ["pages"],
        message: "Home route required",
      });
    for (const [i, item] of definition.navigation.entries())
      if (!routes.has(item.href))
        ctx.addIssue({
          code: "custom",
          path: ["navigation", i, "href"],
          message: "Navigation destination not registered",
        });
    for (const [i, p] of definition.pages.entries()) {
      for (const [j, section] of p.sections.entries()) {
        const targets =
          section.type === "premium-hero"
            ? section.action
              ? [section.action.href]
              : []
            : section.type === "project-gallery"
              ? section.projects.flatMap((project) =>
                  project.href ? [project.href] : [],
                )
              : [];
        for (const target of targets) {
          if (
            !(target.startsWith("#")
              ? p.sections.some((s) => s.id === target.slice(1))
              : routes.has(target))
          )
            ctx.addIssue({
              code: "custom",
              path: ["pages", i, "sections", j],
              message: "Section destination not registered",
            });
        }
      }
    }
    for (const [
      i,
      sectionId,
    ] of definition.permissions.lockedSections.entries())
      if (!sectionIds.has(sectionId))
        ctx.addIssue({
          code: "custom",
          path: ["permissions", "lockedSections", i],
          message: "Unknown locked section",
        });
  });
export type PremiumLayout = z.infer<typeof premiumLayoutSchema>;
export const parsePremiumLayout = (input: unknown): PremiumLayout =>
  premiumLayoutSchema.parse(input);

/** Every edit is applied to an independently validated copy. Server callers
 * must still authenticate, authorize tenant ownership and enforce revisions. */
export type PremiumEdit =
  | { kind: "brand"; name: string }
  | { kind: "visual-experience"; value: VisualExperience }
  | { kind: "business-detail"; field: "description" | "tagline" | "contactEmail" | "phone" | "address" | "serviceArea" | "enquiryEmail"; value: string }
  | { kind: "business-social"; network: "instagram" | "facebook" | "linkedin" | "x"; value: string }
  | { kind: "business-logo"; src: string | null; alt: string | null }
  | {
      kind: "insert-section";
      pageId: string;
      section: PremiumSection;
      index: number;
    }
  | { kind: "remove-section"; pageId: string; sectionId: string }
  | { kind: "insert-page"; page: z.infer<typeof premiumPageSchema> }
  | { kind: "remove-page"; pageId: string }
  | { kind: "page-details"; pageId: string; title: string; description: string; navigation: boolean }
  | { kind: "navigation-order"; hrefs: string[] }
  | { kind: "replace-section"; pageId: string; section: PremiumSection }
  | { kind: "reorder"; pageId: string; sectionIds: string[] }
  | { kind: "token"; key: keyof PremiumLayout["tokens"]; value: string }
  | {
      kind: "responsive";
      pageId: string;
      value: "stack" | "asymmetric" | "gallery";
    };

export function applyPremiumEdit(
  layout: PremiumLayout,
  mode: "guided" | "advanced",
  edit: PremiumEdit,
): PremiumLayout {
  const original = parsePremiumLayout(layout);
  const next = structuredClone(original);
  const perms = next.permissions;
  if (edit.kind === "visual-experience") {
    if (perms.visualExperienceLocked || !(mode === "guided" ? perms.guided.includes("brand") : perms.advanced.includes("tokens"))) throw Error("Design Lock: visual experience changes denied");
    next.visualExperience = visualExperienceSchema.parse(edit.value);
    return parsePremiumLayout(next);
  }
  if (edit.kind === "brand") {
    if (
      edit.name.trim() !== edit.name ||
      edit.name.length < 2 ||
      edit.name.length > 80
    ) throw new Error("Invalid website name");
    if (!perms.guided.includes("brand"))
      throw new Error("Brand edit denied");
    const oldName = next.identity.name;
    next.identity.name = edit.name;
    // Keep page metadata in step with the public navigation/brand name.
    // This does not rewrite the customer's editorial sections.
    for (const page of next.pages) {
      if (page.title === oldName)
        page.title = edit.name;
      else if (page.title.endsWith(" — " + oldName))
        page.title = page.title.slice(0, -oldName.length) + edit.name;
    }
  } else if (edit.kind === "business-detail") {
    if (!(edit.field === "contactEmail" || edit.field === "phone" || edit.field === "address" ||
      edit.field === "serviceArea" || edit.field === "enquiryEmail"
      ? perms.guided.includes("contact") : perms.guided.includes("brand")))
      throw new Error("Business information edit denied");
    if (/<\/?[a-z][^>]*>/i.test(edit.value)) throw new Error("HTML markup is not supported");
    if (edit.field === "description") {
      next.identity.description = edit.value;
    } else {
      const profile = next.identity.profile ?? {};
      next.identity.profile = { ...profile, [edit.field]: edit.value || undefined };
      if (edit.field === "enquiryEmail")
        for (const page of next.pages)
          for (const section of page.sections)
            if (section.type === "contact-panel") section.email = edit.value || undefined;
    }
  } else if (edit.kind === "business-social") {
    if (!perms.guided.includes("link")) throw new Error("Social link edit denied");
    const profile = next.identity.profile ?? {};
    next.identity.profile = {
      ...profile,
      social: { ...profile.social, [edit.network]: edit.value || undefined },
    };
  } else if (edit.kind === "business-logo") {
    if (!perms.guided.includes("image")) throw new Error("Logo edit denied");
    const profile = next.identity.profile ?? {};
    next.identity.profile = { ...profile,
      logo: edit.src && edit.alt ? { src: edit.src, alt: edit.alt } : undefined };
  } else if (edit.kind === "insert-page" || edit.kind === "remove-page") {
    if (mode !== "advanced" || !perms.advanced.includes("pages"))
      throw new Error("Page structure edit denied");
    if (edit.kind === "insert-page") {
      next.pages.push(edit.page);
      if (edit.page.navigation)
        next.navigation.push({
          label: edit.page.title.slice(0, 50),
          href: edit.page.path,
        });
    } else {
      const removed = next.pages.find((p) => p.id === edit.pageId);
      if (
        !removed ||
        removed.path === "/" ||
        removed.sections.some((s) => perms.lockedSections.includes(s.id))
      )
        throw new Error("Design Lock: page removal denied");
      next.pages = next.pages.filter((p) => p.id !== edit.pageId);
      next.navigation = next.navigation.filter((n) => n.href !== removed.path);
    }
  } else if (edit.kind === "page-details") {
    if (mode !== "advanced" || !perms.advanced.includes("pages"))
      throw new Error("Page settings edit denied");
    const page = next.pages.find((entry) => entry.id === edit.pageId);
    if (!page) throw new Error("Unknown page");
    page.title = text(120).parse(edit.title);
    page.description = text(160).parse(edit.description);
    page.navigation = edit.navigation;
    const existing = next.navigation.find((item) => item.href === page.path);
    if (edit.navigation) {
      if (existing) existing.label = page.title.slice(0, 50);
      else next.navigation.push({ label: page.title.slice(0, 50), href: page.path });
    } else {
      next.navigation = next.navigation.filter((item) => item.href !== page.path);
    }
  } else if (edit.kind === "navigation-order") {
    if (mode !== "advanced" || !perms.advanced.includes("pages"))
      throw new Error("Navigation settings edit denied");
    if (edit.hrefs.length !== next.navigation.length ||
        new Set(edit.hrefs).size !== next.navigation.length ||
        edit.hrefs.some((href) => !next.navigation.some((item) => item.href === href)))
      throw new Error("Invalid navigation order");
    next.navigation = edit.hrefs.map((href) => next.navigation.find((item) => item.href === href)!);
  } else if (edit.kind === "token") {
    if (
      mode !== "advanced" ||
      !perms.advanced.includes("tokens") ||
      perms.lockedTokens.includes(edit.key as never)
    )
      throw new Error("Design Lock: token edit denied");
    (next.tokens as Record<string, string>)[edit.key] = edit.value;
    if (edit.key === "accent") {
      const luminance = (hex: string) => {
        const channel = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
          .map((n) => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4);
        return channel[0] * 0.2126 + channel[1] * 0.7152 + channel[2] * 0.0722;
      };
      if (/^#[0-9a-fA-F]{6}$/.test(edit.value)) {
        const a = luminance(next.tokens.background), b = luminance(edit.value);
        if ((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) < 3)
          throw new Error("Accent must have at least 3:1 contrast with the background");
      }
    }
  } else {
    const page = next.pages.find((p) => p.id === edit.pageId);
    if (!page) throw new Error("Unknown page");
    if (edit.kind === "insert-section" || edit.kind === "remove-section") {
      if (mode !== "advanced" || !perms.advanced.includes("section-structure"))
        throw new Error("Section structure edit denied");
      const before = page.sections;
      if (edit.kind === "insert-section") {
        if (
          !Number.isInteger(edit.index) ||
          edit.index < 0 ||
          edit.index > before.length
        )
          throw new Error("Invalid section position");
        page.sections = [
          ...before.slice(0, edit.index),
          edit.section,
          ...before.slice(edit.index),
        ];
      } else {
        if (
          !before.some((s) => s.id === edit.sectionId) ||
          perms.lockedSections.includes(edit.sectionId)
        )
          throw new Error("Design Lock: section removal denied");
        page.sections = before.filter((s) => s.id !== edit.sectionId);
      }
      if (
        before.some(
          (s, i) =>
            perms.lockedSections.includes(s.id) &&
            page.sections[i]?.id !== s.id,
        )
      )
        throw new Error("Design Lock: section position denied");
    } else if (edit.kind === "responsive") {
      if (mode !== "advanced" || !perms.advanced.includes("page-responsive"))
        throw new Error("Responsive edit denied");
      page.responsive = edit.value;
    } else if (edit.kind === "reorder") {
      if (
        !(mode === "guided"
          ? perms.guided.includes("reorder")
          : perms.advanced.includes("section-order"))
      )
        throw new Error("Reorder denied");
      if (
        edit.sectionIds.length !== page.sections.length ||
        new Set(edit.sectionIds).size !== page.sections.length ||
        edit.sectionIds.some((id) => !page.sections.some((s) => s.id === id))
      )
        throw new Error("Invalid section order");
      if (
        page.sections.some(
          (s, i) =>
            perms.lockedSections.includes(s.id) && edit.sectionIds[i] !== s.id,
        )
      )
        throw new Error("Design Lock: section order denied");
      page.sections = edit.sectionIds.map((id) =>
        page.sections.find((s) => s.id === id)!,
      );
    } else {
      const index = page.sections.findIndex((s) => s.id === edit.section.id);
      if (index < 0) throw new Error("Unknown section");
      const before = page.sections[index];
      if (before.type !== edit.section.type || before.id !== edit.section.id)
        throw new Error("Section identity cannot change");
      const structureChanged = before.variant !== edit.section.variant;
      if (
        structureChanged &&
        ((mode === "guided"
          ? !perms.guided.includes("variant")
          : !perms.advanced.includes("variant")) ||
          perms.lockedSections.includes(before.id))
      )
        throw new Error("Design Lock: variant edit denied");
      // Permissions come from the stored definition, never from the edit request.
      const check = (a: unknown, b: unknown, key: string): void => {
        if (JSON.stringify(a) === JSON.stringify(b)) return;
        if (typeof b === "string" && /<\/?[a-z][^>]*>/i.test(b))
          throw new Error("HTML markup is not supported in page content");
        if (Array.isArray(a) && Array.isArray(b)) {
          if (a.length !== b.length)
            throw new Error("Section structure cannot change");
          a.forEach((value, i) => check(value, b[i], key));
          return;
        }
        if (key === "image") {
          if (!perms.guided.includes("image"))
            throw new Error("Image edit denied");
          return;
        }
        if (a && b && typeof a === "object" && typeof b === "object") {
          for (const field of new Set([...Object.keys(a), ...Object.keys(b)]))
            if (!["variant", "id", "type"].includes(field))
              check(
                (a as Record<string, unknown>)[field],
                (b as Record<string, unknown>)[field],
                field,
              );
          return;
        }
        const capability =
          key === "email" ? "contact" : key === "href" ? "link" : "text";
        if (!perms.guided.includes(capability))
          throw new Error("Content edit denied");
      };
      check(before, edit.section, "section");
      page.sections[index] = edit.section;
      // A website's enquiry address is shared content, not a per-page
      // credential. Keep matching contact panels consistent when a customer
      // replaces the starter address. Do not overwrite a different address
      // explicitly customized on another page.
      if (
        before.type === "contact-panel" &&
        edit.section.type === "contact-panel" &&
        before.email !== edit.section.email
      ) {
        for (const otherPage of next.pages) {
          for (const other of otherPage.sections) {
            if (other.type === "contact-panel" && other.email === before.email) {
              other.email = edit.section.email;
            }
          }
        }
      }
    }
  }
  return parsePremiumLayout(next);
}

export const premiumEditSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("visual-experience"), value: visualExperienceSchema }).strict(),
  z.object({
    kind: z.literal("brand"),
    name: z.string().trim().min(2).max(80),
  }).strict(),
  z.object({
    kind: z.literal("business-detail"),
    field: z.enum(["description", "tagline", "contactEmail", "phone", "address", "serviceArea", "enquiryEmail"]),
    value: z.string().trim().max(500),
  }).strict(),
  z.object({
    kind: z.literal("business-social"),
    network: z.enum(["instagram", "facebook", "linkedin", "x"]),
    value: z.string().trim().max(350),
  }).strict(),
  z.object({
    kind: z.literal("business-logo"),
    src: asset.nullable(),
    alt: text(200).nullable(),
  }).strict().refine((v) => (v.src === null) === (v.alt === null), "Logo and description must be supplied together"),
  z
    .object({
      kind: z.literal("insert-section"),
      pageId: id,
      section: premiumSectionSchema,
      index: z.number().int().min(0).max(24),
    })
    .strict(),
  z
    .object({ kind: z.literal("remove-section"), pageId: id, sectionId: id })
    .strict(),
  z
    .object({ kind: z.literal("insert-page"), page: premiumPageSchema })
    .strict(),
  z.object({ kind: z.literal("remove-page"), pageId: id }).strict(),
  z.object({
    kind: z.literal("page-details"),
    pageId: id,
    title: text(120),
    description: text(160),
    navigation: z.boolean(),
  }).strict(),
  z.object({
    kind: z.literal("navigation-order"),
    hrefs: z.array(path).max(12),
  }).strict(),
  z
    .object({
      kind: z.literal("replace-section"),
      pageId: id,
      section: premiumSectionSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("reorder"),
      pageId: id,
      sectionIds: z.array(id).min(1).max(24),
    })
    .strict(),
  z
    .object({
      kind: z.literal("token"),
      key: premiumTokensSchema.keyof(),
      value: z.string().max(80),
    })
    .strict(),
  z
    .object({
      kind: z.literal("responsive"),
      pageId: id,
      value: z.enum(["stack", "asymmetric", "gallery"]),
    })
    .strict(),
]);

/** Account/tab scope is supplied by the existing workspace recovery envelope. */
export const compositionRecoverySchema = z
  .object({
    version: z.literal(1),
    mode: z.enum(["guided", "advanced"]),
    revision: z.string().regex(/^"draft-[a-f0-9]{64}"$/),
    edits: z.array(premiumEditSchema).min(1).max(40),
  })
  .strict();
