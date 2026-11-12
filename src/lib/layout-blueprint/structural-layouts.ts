import {
  parsePremiumLayout,
  type PremiumLayout,
  type PremiumSection,
} from "./premium-composition";

export const structuralLayoutIds = ["meridian", "canvas", "haven"] as const;
export function structuralLayout(
  name: (typeof structuralLayoutIds)[number],
  siteName: string,
): PremiumLayout {
  const contact: PremiumSection = {
    id: "contact",
    type: "contact-panel",
    variant: "split",
    heading: "Start a conversation",
    body: "Tell us what you have in mind.",
  };
  const story: PremiumSection = {
    id: "story",
    type: "editorial-story",
    variant: "narrow",
    heading:
      name === "meridian"
        ? "Illustrative case study: a clearer direction"
        : name === "canvas"
          ? "Notes on making"
          : "Rooted in this place",
    body: "Every detail starts with a clear purpose. This structural demonstration is ready for your own content.",
  };
  const gallery: PremiumSection = {
    id: "projects",
    type: "project-gallery",
    variant: "masonry",
    heading: "Selected projects",
    projects: [
      {
        title: "Form and purpose",
        description: "An exploration of proportion and material.",
        image: {
          src: "builtin:portfolio/work-1",
          alt: "Original geometric study",
        },
      },
    ],
  };
  const journey: PremiumSection = {
    id: "services",
    type: "service-journey",
    variant: "chapters",
    heading: "From direction to delivery",
    items: [
      { title: "Understand", body: "Establish the challenge and its context." },
      { title: "Shape", body: "Create a clear, achievable direction." },
      { title: "Deliver", body: "Work together toward a durable result." },
    ],
  };
  const hero: PremiumSection = {
    id: "hero",
    type: "premium-hero",
    variant: name === "haven" ? "full-bleed" : "offset",
    eyebrow:
      name === "haven"
        ? "A slower kind of stay"
        : "Clarity for ambitious organisations",
    heading:
      name === "haven"
        ? "Space to pause. Room to explore."
        : "A clear direction for what comes next.",
    body: "Thoughtfully composed, with people and place at its heart.",
    action: { label: "Discover more", href: "/about" },
    ...(name === "haven"
      ? {
          image: {
            src: "builtin:hospitality/hero",
            alt: "Illustrated retreat in a mountain landscape",
          },
        }
      : {}),
  };
  const experience: PremiumSection = {
    id: "stay",
    type: "experience",
    variant: "immersive",
    heading: "Stay a little longer",
    body: "Quiet spaces, local stories and time to explore.",
    image: {
      src: "builtin:hospitality/stay",
      alt: "Illustrated room with a landscape window",
    },
  };
  const sections: PremiumSection[] =
    name === "meridian"
      ? [
          hero,
          {
            id: "trust",
            type: "trust-strip",
            variant: "inline",
            items: [
              "Clear priorities",
              "Collaborative delivery",
              "Lasting outcomes",
            ],
          },
          journey,
          story,
          contact,
        ]
      : name === "canvas"
        ? [gallery, story, contact]
        : [hero, experience, story, contact];
  const interior =
    name === "meridian"
      ? [story, journey, contact]
      : name === "canvas"
        ? [story, gallery, contact]
        : [experience, story, contact];
  return parsePremiumLayout({
    schema: "lucia.layout-composition",
    version: 2,
    layoutId: `lucia.layout.${name}`,
    layoutVersion: 1,
    category: "Structural demonstration",
    identity: {
      name: siteName,
      description: `${name} structural demonstration, not a finished premium Layout.`,
    },
    tokens: {
      background: name === "meridian" ? "#f1f3f6" : "#f7f2e9",
      foreground: name === "meridian" ? "#14263e" : "#282b28",
      accent: name === "canvas" ? "#934025" : "#46654a",
      font: name === "meridian" ? "system-sans" : "editorial-serif",
      scale: "balanced",
      width: name === "canvas" ? "wide" : "standard",
      radius: "square",
      rhythm: "measured",
      motion: "none",
    },
    navigation: [
      { label: "Home", href: "/" },
      { label: name === "haven" ? "Our place" : "About", href: "/about" },
    ],
    pages: [
      {
        id: "home",
        path: "/",
        title: siteName,
        description: "A thoughtful introduction.",
        navigation: true,
        sections,
        responsive: name === "canvas" ? "gallery" : "asymmetric",
      },
      {
        id: "about",
        path: "/about",
        title: `About ${siteName}`,
        description: "Our story and approach.",
        navigation: true,
        sections: interior.map((s) => ({ ...s, id: `about-${s.id}` })),
        responsive: "stack",
      },
    ],
    permissions: {
      guided: ["text", "image", "link", "contact", "reorder"],
      advanced: [
        "variant",
        "tokens",
        "section-order",
        "page-responsive",
        "section-structure",
        "pages",
      ],
      lockedSections: sections.some((s) => s.id === "hero") ? ["hero"] : [],
      lockedTokens: ["font"],
    },
  });
}
