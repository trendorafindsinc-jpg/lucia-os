import { z } from "zod";
import { premiumCandidateBriefs } from "./premium-layouts/candidate-briefs";
export const expressionSchema = z.enum(["elegant", "dynamic", "cinematic"]);
export type ExperienceExpression = z.infer<typeof expressionSchema>;
const fields = {
  expression: expressionSchema,
  motion: z.enum(["none", "subtle", "expressive"]),
  reveal: z.enum(["none", "fade", "rise"]),
  transition: z.enum(["none", "fade", "slide"]),
  interaction: z.enum(["none", "lift", "spotlight"]),
  background: z.enum(["paper", "contrast", "aurora"]),
  typography: z.enum(["classic", "editorial", "kinetic"]),
  image: z.enum(["framed", "bleed", "portrait"]),
  depth: z.enum(["flat", "layered", "atmospheric"]),
  lighting: z.enum(["natural", "soft", "nocturne"]),
  reducedMotion: z.boolean(),
};
/** Closed visual vocabulary, shared by server validation, Studio and renderer. */
export const visualFields = z.object(fields).strict();
export type VisualExperience = z.infer<typeof visualFields>;
export function expressionOptions(expression: ExperienceExpression) {
  return {
    motion: expression === "elegant" ? ["none", "subtle"] : ["none", "subtle", "expressive"],
    reveal: ["none", "fade", "rise"], transition: ["none", "fade", "slide"],
    interaction: expression === "elegant" ? ["none", "lift"] : ["none", "lift", "spotlight"],
    background: expression === "elegant" ? ["paper", "contrast"] : ["paper", "contrast", "aurora"],
    typography: expression === "dynamic" ? ["classic", "kinetic"] : ["classic", "editorial"],
    image: ["framed", "bleed", "portrait"],
    depth: expression === "elegant" ? ["flat", "layered"] : expression === "dynamic" ? ["flat", "layered"] : ["flat", "layered", "atmospheric"],
    lighting: ["natural", "soft", "nocturne"],
  } as const;
}
export const visualExperienceSchema = visualFields.superRefine((value, ctx) => {
  for (const [key, options] of Object.entries(expressionOptions(value.expression))) {
    if (!(options as readonly string[]).includes(value[key as keyof VisualExperience] as string)) ctx.addIssue({ code: "custom", path: [key], message: "This treatment is not supported by the expression." });
  }
});
/** Capability rules over the canonical catalogue, not new Layout identities. */
export function supportedExpressions(layoutId: string): ExperienceExpression[] {
  const slug = layoutId.replace(/^lucia\.layout\./, "");
  if (slug === "meridian") return ["elegant"];
  const brief = premiumCandidateBriefs.find((item) => item.id === slug);
  if (!brief) return [];
  if (["care", "verity", "civic", "vault", "scholar"].includes(slug)) return ["elegant"];
  if (brief.category === 1) return ["elegant", "dynamic", "cinematic"];
  if ([2, 4, 7].includes(brief.category)) return ["elegant", "cinematic"];
  return ["elegant", "dynamic"];
}
export function visualPreset(expression: ExperienceExpression): VisualExperience {
  const shared = { expression, reducedMotion: false };
  return visualExperienceSchema.parse(expression === "elegant"
    ? { ...shared, motion: "subtle", reveal: "fade", transition: "fade", interaction: "lift", background: "paper", typography: "editorial", image: "framed", depth: "flat", lighting: "natural" }
    : expression === "dynamic"
    ? { ...shared, motion: "expressive", reveal: "rise", transition: "slide", interaction: "lift", background: "aurora", typography: "kinetic", image: "portrait", depth: "layered", lighting: "soft" }
    : { ...shared, motion: "subtle", reveal: "fade", transition: "fade", interaction: "spotlight", background: "contrast", typography: "editorial", image: "bleed", depth: "atmospheric", lighting: "nocturne" });
}
