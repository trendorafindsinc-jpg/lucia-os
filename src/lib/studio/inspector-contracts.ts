import { z } from "zod";

const localPathSchema = z.string().trim().min(1).max(240).refine((path) => {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("//") ||
      /[?#\\\\\\u0000-\\u001f]/.test(path) || /%(?:2f|5c)/i.test(path)) return false;
  try {
    const decoded = decodeURIComponent(path);
    if (decoded.split("/").some((part) => part === "." || part === "..")) return false;
  } catch { return false; }
  return true;
}, "Use a safe local path beginning with /.");

export const websiteInspectorSchema = z.object({
  name: z.string().trim().min(1).max(120),
}).strict();

export const pageInspectorSchema = z.object({
  title: z.string().trim().min(1).max(120),
  path: localPathSchema,
}).strict();

const cardItemSchema = z.object({
  heading: z.string().trim().min(1).max(160),
  description: z.string().max(1000).optional(),
}).strict();

export const sectionInspectorSchema = z.object({
  recipeId: z.enum([
    "lucia.design.section.hero",
    "lucia.design.section.feature-grid",
    "lucia.design.section.services",
  ]),
  heading: z.string().trim().min(1).max(240),
  description: z.string().max(4000),
  actionLabel: z.string().max(100),
  actionHref: z.string().max(240),
  items: z.array(cardItemSchema).min(1).max(24).optional(),
}).strict().superRefine((value, context) => {
  const hasLabel = value.actionLabel.trim().length > 0;
  const hasHref = value.actionHref.trim().length > 0;
  if (hasLabel !== hasHref) {
    context.addIssue({ code: "custom", path: ["actionHref"], message: "Provide both a button label and destination, or leave both blank." });
  }
  if (hasHref && !localPathSchema.safeParse(value.actionHref).success) {
    context.addIssue({ code: "custom", path: ["actionHref"], message: "Button destination must be a safe local path." });
  }
  if (value.recipeId !== "lucia.design.section.hero" && !value.items?.length) {
    context.addIssue({ code: "custom", path: ["items"], message: "Feature and service sections need at least one card." });
  }
});

export type WebsiteInspectorValues = z.infer<typeof websiteInspectorSchema>;
export type PageInspectorValues = z.infer<typeof pageInspectorSchema>;
export type SectionInspectorValues = z.infer<typeof sectionInspectorSchema>;

export function sectionPropertiesFromInspector(
  values: SectionInspectorValues,
  existing: Record<string, unknown>,
): Record<string, unknown> {
  const content: Record<string, unknown> = {
    heading: values.heading,
    ...(values.description ? { description: values.description } : {}),
    ...(values.actionLabel.trim() ? { actionLabel: values.actionLabel.trim(), actionHref: values.actionHref.trim() } : {}),
    ...(values.items?.length ? { items: values.items } : {}),
  };
  return {
    ...(typeof existing.category === "string" ? { category: existing.category } : {}),
    ...(existing.defaults && typeof existing.defaults === "object" && !Array.isArray(existing.defaults)
      ? { defaults: existing.defaults } : {}),
    recipeId: values.recipeId,
    recipeVersion: 1,
    content,
  };
}
