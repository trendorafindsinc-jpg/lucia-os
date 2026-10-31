import {
  parsePremiumLayout,
  type PremiumLayout,
  type PremiumSection,
} from "../premium-composition";
import { meridianCandidate } from "./meridian";
import {
  premiumCandidateBriefs,
  type PremiumCandidateBrief,
} from "./candidate-briefs";

/**
 * Candidate definitions are deliberately not installed as purchasable/customer
 * Layouts. Phase 14 requires independent rendering, art, rights, originality,
 * performance and publishing acceptance before release.
 */
const categories = [
  { name: "Business & Professional Services", offer: "services", work: "work", offerLabel: "Services", workLabel: "Work" },
  { name: "Portfolio & Creative", offer: "practice", work: "projects", offerLabel: "Practice", workLabel: "Projects" },
  { name: "Hospitality & Lifestyle", offer: "experiences", work: "stories", offerLabel: "Experiences", workLabel: "Stories" },
  { name: "Education & Learning", offer: "programmes", work: "learning-life", offerLabel: "Programmes", workLabel: "Learning life" },
  { name: "Commerce & Product Showcases", offer: "collections", work: "materials", offerLabel: "Collections", workLabel: "Materials" },
  { name: "Technology & Digital Products", offer: "capabilities", work: "approach", offerLabel: "Capabilities", workLabel: "Approach" },
  { name: "Community, Nonprofit & Personal", offer: "initiatives", work: "stories", offerLabel: "Initiatives", workLabel: "Stories" },
  { name: "Property, Health & Local Services", offer: "services", work: "projects", offerLabel: "Services", workLabel: "Projects" },
] as const;

const assets = [
  "builtin:portfolio/work-1",
  "builtin:hospitality/hero",
  "builtin:hospitality/stay",
] as const;
const slug = (value: string) =>
  value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const categoryOrder = [
  "meridian", "keystone", "verity", "summit", "foundry", "civic",
  "canvas", "prism", "atelier", "monograph", "frame", "muse",
  "savour", "haven", "bloom", "nomad", "gather", "bistro",
  "academia", "sprout", "scholar", "mentor", "elevate", "campus",
  "maison", "origin", "object", "harvest", "lustre", "craft",
  "nexus", "orbit", "vector", "pulse", "vault", "signal",
  "impact", "together", "journal", "voice", "heritage", "collective",
  "estate", "care", "build", "motion", "local", "greenfield",
] as const;

export const premiumCandidateIds: readonly string[] = categoryOrder.map(
  (id) => "lucia.layout." + id,
);

export function premiumCandidate(id: string, siteName?: string): PremiumLayout {
  if (id === "lucia.layout.meridian") return meridianCandidate(siteName);
  const brief = premiumCandidateBriefs.find(
    (item) => "lucia.layout." + item.id === id,
  );
  if (!brief) throw new Error("Unknown premium candidate");
  return buildCandidate(brief, siteName ?? brief.name + " · Demo");
}

function buildCandidate(brief: PremiumCandidateBrief, siteName: string): PremiumLayout {
  const category = categories[brief.category];
  if (!category) throw new Error("Unknown category");
  const index = categoryOrder.indexOf(brief.id as (typeof categoryOrder)[number]);
  if (index < 0) throw new Error("Unknown canonical identity");
  const offerPath = "/" + category.offer;
  const workPath = "/" + category.work;
  const casePaths = brief.projects.map(
    (name, i) => workPath + "/" + slug(name) + "-" + (i + 1),
  );
  const art = assets[index % assets.length];
  const artAlt = "Original geometric illustration for fictional " + brief.name + " design study";
  const asset = { src: art, alt: artAlt };
  const heroVariants = ["typographic", "offset", "full-bleed"] as const;
  const galleryVariants = ["masonry", "grid", "rail"] as const;
  const heroVariant = heroVariants[index % 3];
  const galleryVariant = galleryVariants[(index + brief.category) % 3];
  const storyVariants = ["narrow", "split", "alternating"] as const;
  const rhythm = ["spacious", "tight", "measured"] as const;
  const page = (id: string, path: string, title: string, description: string,
    sections: PremiumSection[], responsive: "stack" | "asymmetric" | "gallery") => ({
      id, path, title: title.slice(0, 120), description: description.slice(0, 160),
      navigation: true, sections, responsive,
    });
  const makeHero = (key: string, headline: string, body: string,
    destination = offerPath): PremiumSection => ({
    id: key + "-hero", type: "premium-hero", variant: heroVariant,
    eyebrow: category.name + " / Fictional design",
    heading: headline, body, ...(heroVariant === "full-bleed" ? { image: asset } : {}),
    action: { label: destination === "/contact" ? "Enquire about this work" : "Explore " + category.offerLabel.toLowerCase(), href: destination },
  });
  const makeTrust = (key: string): PremiumSection => ({
    id: key + "-index", type: "trust-strip",
    variant: index % 2 === 0 ? "inline" : "stacked",
    items: brief.offers,
  });
  const makeServices = (key: string): PremiumSection => ({
    id: key + "-chapters", type: "service-journey",
    variant: index % 2 === 0 ? "chapters" : "columns",
    heading: category.offerLabel + " at a glance",
    items: brief.offers.map((title, i) => ({
      title,
      body: [
        "An illustrative introduction to " + title.toLowerCase() + ". The process and availability must be confirmed by the real organisation.",
        "The demonstration explains the decisions, practical preparation and people involved before this work begins.",
        "A focused way to understand the scope, expected steps and next conversation without claiming results or credentials.",
      ][(i + index) % 3],
    })),
  });
  const makeGallery = (key: string): PremiumSection => ({
    id: key + "-gallery", type: "project-gallery", variant: galleryVariant,
    heading: category.workLabel + " / selected demonstrations",
    projects: brief.projects.map((title, i) => ({
      title, image: asset, href: casePaths[i],
      description: "Fictional " + brief.name + " study " + (i + 1) + ". A narrative demonstration, not completed client work or an available product.",
    })),
  });
  const makeStory = (key: string): PremiumSection => ({
    id: key + "-story", type: "editorial-story",
    variant: storyVariants[(index + brief.category) % 3],
    heading: "The thinking behind " + brief.name,
    body: brief.story + " This is a fictional editorial demonstration; replace this narrative with genuine, approved organisation material.",
    ...(index % 2 === 0 ? { image: asset } : {}),
  });
  const makeExperience = (key: string): PremiumSection => ({
    id: key + "-feature", type: "experience",
    variant: index % 2 === 0 ? "editorial" : "immersive",
    heading: "A closer look at " + brief.projects[index % 3],
    body: brief.story + " The accompanying illustration is original structural artwork, not documentary photography.",
    image: asset,
  });
  const makeContact = (key: string): PremiumSection => ({
    id: key + "-contact", type: "contact-panel",
    variant: index % 2 === 0 ? "minimal" : "split",
    heading: "A useful conversation starts here.",
    body: "Fictional " + brief.name + " website demonstration. The address below is a non-working placeholder. Replace it and confirm enquiry handling before publication.",
    email: "hello@example.com",
  });
  // These compositions intentionally use different page hierarchies, variants,
  // introductory narratives and responsive emphasis per canonical layout.
  const pieces = [
    makeHero("home", brief.title, brief.pitch),
    makeTrust("home"),
    makeServices("home"),
    makeGallery("home"),
    makeStory("home"),
    makeExperience("home"),
    makeContact("home"),
  ];
  const homeOrders = [
    [0, 1, 2, 3, 4, 6], [0, 4, 3, 2, 1, 6],
    [0, 5, 1, 3, 2, 6], [0, 2, 4, 3, 1, 6],
    [0, 3, 5, 1, 4, 6], [0, 1, 4, 5, 2, 6],
    [0, 5, 2, 4, 3, 6], [0, 3, 1, 4, 5, 6],
    [0, 4, 2, 5, 1, 6], [0, 2, 3, 5, 4, 6],
    [0, 1, 5, 4, 3, 6], [0, 3, 4, 2, 5, 6],
  ];
  const chosen = homeOrders[index % homeOrders.length];
  // Alternate two interior narratives without imposing the same site shape.
  const pages = [
    page("home", "/", siteName, brief.pitch, chosen.map((i) => pieces[i]),
      index % 3 === 0 ? "gallery" : index % 3 === 1 ? "asymmetric" : "stack"),
    page("offerings", offerPath, category.offerLabel + " — " + siteName,
      brief.pitch, [
        makeHero("offers", "Consider the possibilities.", brief.pitch, "/contact"),
        makeServices("offers"), makeStory("offers"), makeContact("offers"),
      ], index % 2 === 0 ? "asymmetric" : "stack"),
    page("portfolio", workPath, category.workLabel + " — " + siteName,
      "Illustrative studies and stories from this fictional " + brief.name + " website.", [
        makeHero("portfolio", "A collection of perspectives.", brief.story, "/contact"),
        makeGallery("portfolio"), makeExperience("portfolio"), makeContact("portfolio"),
      ], "gallery"),
    page("about", "/about", "About — " + siteName,
      brief.story, index % 2 === 0 ? [
        makeHero("about", "Meet the thinking behind the work.", brief.story, "/contact"),
        makeStory("about"), makeExperience("about"), makeContact("about"),
      ] : [
        makeHero("about", "A point of view, shaped by practice.", brief.story, "/contact"),
        makeTrust("about"), makeStory("about"), makeContact("about"),
      ], "asymmetric"),
    page("contact", "/contact", "Contact — " + siteName,
      "A sample enquiry route for " + brief.name + ".", [
        makeHero("contact", "Tell us what you are imagining.", brief.pitch, "/contact"),
        makeContact("contact"),
      ], "stack"),
    ...brief.projects.map((name, i) => page(
      "study-" + (i + 1), casePaths[i], name + " — " + siteName,
      "A clearly fictional " + name + " narrative.", [
        makeHero("study-" + i, name, "Fictional study / " + brief.pitch, workPath),
        { id: "study-" + i + "-context", type: "editorial-story",
          variant: storyVariants[(index + i) % 3],
          heading: "The starting question",
          body: "What would it take to approach " + name.toLowerCase() +
            " thoughtfully? This case offers an illustrative scenario rather than describing a real commission." },
        { id: "study-" + i + "-method", type: "editorial-story",
          variant: storyVariants[(index + i + 1) % 3],
          heading: "A considered approach",
          body: brief.story + " A genuine project would require verifiable evidence, permissions and specific scope." },
        makeExperience("study-" + i), makeContact("study-" + i),
      ], i % 2 === 0 ? "asymmetric" : "stack",
    )),
  ];
  const fonts = ["editorial-serif", "system-sans", "condensed-sans"] as const;
  const scales = ["balanced", "expressive", "compact"] as const;
  return parsePremiumLayout({
    schema: "lucia.layout-composition", version: 2,
    layoutId: "lucia.layout." + brief.id, layoutVersion: 1,
    category: category.name,
    identity: { name: siteName, description: "Fictional " + brief.name + " design candidate. " + brief.pitch },
    tokens: {
      ...brief.colors, font: fonts[index % 3], scale: scales[(index + brief.category) % 3],
      width: index % 3 === 0 ? "wide" : index % 3 === 1 ? "reading" : "standard",
      radius: index % 3 === 0 ? "square" : index % 3 === 1 ? "rounded" : "subtle",
      rhythm: rhythm[index % 3], motion: "none",
    },
    navigation: [
      { label: "Home", href: "/" },
      { label: category.offerLabel, href: offerPath },
      { label: category.workLabel, href: workPath },
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
    pages,
    permissions: {
      guided: ["text", "image", "link", "brand", "contact", "reorder"],
      advanced: ["variant", "tokens", "section-order", "page-responsive", "section-structure", "pages"],
      lockedSections: ["home-hero"],
      lockedTokens: ["font", "scale", "rhythm"],
    },
  });
}
