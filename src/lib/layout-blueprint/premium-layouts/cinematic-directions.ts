import { parsePremiumLayout, type PremiumLayout } from "../premium-composition";
import { supportedExpressions, visualPreset } from "../visual-experience";
import type { PremiumCandidateBrief } from "./candidate-briefs";

/** Forty original visual editions. Existing saved definitions and eight flagship
 * layouts retain their existing layoutVersion and are not rewritten. */
const cinematicIds = [
  "keystone","verity","summit","foundry","civic",
  "prism","atelier","monograph","frame","muse",
  "savour","bloom","nomad","gather","bistro",
  "sprout","scholar","mentor","elevate","campus",
  "origin","object","harvest","lustre","craft",
  "orbit","vector","pulse","vault","signal",
  "together","journal","voice","heritage","collective",
  "care","build","motion","local","greenfield",
] as const;

export function elevateCinematicCandidate(source: PremiumLayout, brief: PremiumCandidateBrief): PremiumLayout {
  const index = cinematicIds.indexOf(brief.id as typeof cinematicIds[number]);
  if (index < 0) throw Error("Unknown cinematic candidate");
  const next = structuredClone(source);
  // A new edition is not a migration: previously saved r1 sites still render.
  next.layoutVersion = 2;
  const expressions = supportedExpressions(next.layoutId);
  const preferred = [2, 4, 7].includes(brief.category) || ["prism", "frame", "orbit", "voice", "motion"].includes(brief.id)
    ? "cinematic" : "dynamic";
  const expression = expressions.includes(preferred) ? preferred
    : expressions.includes("dynamic") ? "dynamic"
    : expressions.includes("cinematic") ? "cinematic" : "elegant";
  next.visualExperience = visualPreset(expression);
  next.tokens = {
    ...next.tokens,
    width: [1, 6, 16, 25, 32].includes(index) ? "standard" : "wide",
    font: ["verity", "atelier", "monograph", "savour", "scholar", "object", "journal", "heritage", "care"].includes(brief.id) ? "editorial-serif"
      : ["prism", "frame", "pulse", "motion"].includes(brief.id) ? "condensed-sans" : "system-sans",
    scale: index % 5 === 1 ? "balanced" : "expressive",
    rhythm: index % 6 === 0 ? "measured" : "spacious",
    radius: [0, 3, 9, 13, 18, 21, 28, 35].includes(index) ? "square" : index % 4 === 0 ? "rounded" : "subtle",
    motion: "none",
  };
  const artwork = (kind: "hero" | "detail") => ({
    src: "builtin:premium/cinematic-" + brief.id + "-" + kind,
    alt: "Original " + (kind === "hero" ? "cinematic cover artwork" : "editorial illustration")
      + " for fictional " + brief.name + " website study",
  });
  for (const page of next.pages) {
    for (const section of page.sections) {
      if (section.type === "premium-hero") {
        section.image = artwork(page.path === "/" || page.path === "/about" ? "hero" : "detail");
        section.variant = page.path === "/"
          ? index % 4 === 0 || index % 4 === 3 ? "full-bleed" : "offset"
          : index % 3 === 0 ? "offset" : "full-bleed";
        if (page.path !== "/") section.eyebrow = brief.name + " / " + page.title.split(" — ")[0];
      }
      if (section.type === "project-gallery") {
        section.variant = (["masonry", "grid", "rail"] as const)[(index + (page.path === "/" ? 0 : 1)) % 3];
        section.projects = section.projects.map((project, i) => ({
          ...project, image: artwork(i % 2 === 0 ? "detail" : "hero"),
        }));
      }
      if (section.type === "editorial-story") {
        section.image = artwork("detail");
        section.variant = (["split", "alternating", "narrow"] as const)[(index + page.sections.indexOf(section)) % 3];
      }
      if (section.type === "experience") {
        section.image = artwork("detail");
        section.variant = index % 2 === 0 ? "immersive" : "editorial";
      }
      if (section.type === "service-journey") {
        section.variant = index % 2 ? "columns" : "chapters";
        section.items = section.items.map((item, i) => ({
          ...item,
          body: [
            brief.story + " This is a fictional design example; confirm the scope with the actual organisation.",
            "For " + item.title.toLowerCase() + ", careful preparation and clear communication matter as much as the presentation. This is illustrative, not a claim of completed work.",
            "Explore the choices, consider practical details and discuss next steps with the real team. Availability and qualifications must be independently verified.",
          ][(i + index) % 3].slice(0, 500),
        }));
      }
    }
  }
  return parsePremiumLayout(next);
}
