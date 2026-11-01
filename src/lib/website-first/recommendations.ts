import { premiumStartingLayouts } from "@/lib/templates/starting-layouts";

/** Deterministic recommendations from the existing canonical 48, never an AI service. */
const matches: { words: RegExp; ids: readonly string[]; why: string }[] = [
  { words: /school|academy|college|student|teacher|tutor|education|learn|training/i,
    ids: ["academia", "campus", "scholar"], why: "Built around programmes, learning and school information" },
  { words: /barber|hair|salon|beauty|groom|spa|wellness|local service|plumb|electri|repair/i,
    ids: ["local", "care", "motion"], why: "A clear service showcase with practical ways to enquire" },
  { words: /restaurant|food|cafe|bar|hotel|guest|travel|event|hospitality|venue/i,
    ids: ["bistro", "haven", "savour"], why: "Showcases experiences, atmosphere and customer enquiries" },
  { words: /shop|product|store|commerce|retail|fashion|market|goods/i,
    ids: ["maison", "harvest", "origin"], why: "Presents products and collections prominently" },
  { words: /art|photo|design|creative|portfolio|film|studio|artist/i,
    ids: ["canvas", "frame", "atelier"], why: "Highlights portfolios, projects and visual storytelling" },
  { words: /software|tech|startup|digital|app|saas/i,
    ids: ["nexus", "orbit", "vector"], why: "Introduces digital products and technical services" },
  { words: /nonprofit|charity|church|community|foundation|volunteer|association/i,
    ids: ["impact", "together", "collective"], why: "Focuses on community initiatives and participation" },
  { words: /estate|real.?estate|property|construction|architect|build|housing/i,
    ids: ["estate", "build", "greenfield"], why: "Makes properties, projects and enquiries easy to explore" },
];
const fallback = ["meridian", "keystone", "local"] as const;
const canonical = (shortId: string) => "lucia.layout." + shortId;

export function recommendWebsiteLayouts(whatDoYouDo: string, purpose: string, preferredStyle = "") {
  const context = (whatDoYouDo + " " + purpose).slice(0, 400);
  const match = matches.find((item) => item.words.test(context));
  const ids = match?.ids ?? fallback;
  const result = ids.map((id) => premiumStartingLayouts.find((layout) => layout.id === canonical(id)))
    .filter((layout): layout is (typeof premiumStartingLayouts)[number] => Boolean(layout));
  return result.map((layout, index) => ({
    ...layout,
    reason: (match?.why ?? "An adaptable multi-page design for introducing your work") +
      (preferredStyle && preferredStyle !== "No preference" && index === 0 ? " · You can refine the style later" : ""),
  }));
}
export function allCanonicalWebsiteLayouts() {
  return premiumStartingLayouts;
}
