import { z } from "zod";
import { getTemplateById, websiteTemplates } from "@/lib/templates/catalogue";

export const editorPaletteIds = ["original", "ocean", "forest", "sunset"] as const;
export type EditorPaletteId = (typeof editorPaletteIds)[number];

export const editorPalettes: Record<EditorPaletteId, readonly [string, string, string]> = {
  original: ["#142c3b", "#d4e5dc", "#f5f2ea"],
  ocean: ["#163b68", "#c9e4f7", "#f5f9fd"],
  forest: ["#234d3a", "#d3e8cb", "#f6f8ef"],
  sunset: ["#693d35", "#f1d0b7", "#fff8f1"],
};

export const siteDraftSchema = z.object({
  templateId: z.string().refine((id) => Boolean(getTemplateById(id)), "Choose a catalogue Layout."),
  siteName: z.string().trim().min(2).max(80),
  headline: z.string().trim().min(2).max(100),
  description: z.string().trim().min(2).max(220),
  buttonLabel: z.string().trim().min(2).max(32),
  palette: z.enum(editorPaletteIds),
  visibleSections: z.array(z.string().min(1)).min(1).max(12),
});

export type SiteDraft = z.infer<typeof siteDraftSchema>;

export function makeInitialDraft(templateId: string): SiteDraft {
  const template = getTemplateById(templateId) ?? websiteTemplates[0];
  return {
    templateId: template.id,
    siteName: template.name,
    headline: template.name,
    description: template.description,
    buttonLabel: template.sections.some((section) => /contact|enquir|book|apply/i.test(section)) ? "Get in touch" : "Learn more",
    palette: "original",
    visibleSections: [...template.sections],
  };
}

export function moveSection(sections: readonly string[], index: number, direction: -1 | 1): string[] {
  const nextIndex = index + direction;
  if (index < 0 || index >= sections.length || nextIndex < 0 || nextIndex >= sections.length) return [...sections];
  const result = [...sections];
  [result[index], result[nextIndex]] = [result[nextIndex], result[index]];
  return result;
}

/** Editing recovery retains temporarily invalid text; API saves still use siteDraftSchema. */
export const siteDraftRecoverySchema = siteDraftSchema.extend({
 siteName: z.string().max(80), headline:z.string().max(100),description:z.string().max(220),buttonLabel:z.string().max(32),
 visibleSections:z.array(z.string().min(1).max(160)).max(12),
});
