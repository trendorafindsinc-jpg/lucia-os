import {
  parsePremiumLayout,
  type PremiumLayout,
  type PremiumSection,
} from "../premium-composition";

/** Editorially authored flagship expansion. Structural content is
 * demonstrative and cannot be represented as a working service, verified
 * institution, or licensed photography.
 */
type Interior = {
  path: string;
  label: string;
  title: string;
  lead: string;
  focus: string;
  details: string;
  action: string;
};
type Direction = {
  homeSequence: ("hero" | "index" | "chapters" | "gallery" | "story" | "feature" | "contact")[];
  heroVariant: "typographic" | "offset" | "full-bleed";
  interiors: [Interior, Interior];
};
const directions: Readonly<Record<string, Direction>> = {
  canvas: {
    homeSequence: ["hero", "gallery", "story", "contact"],
    heroVariant: "typographic",
    interiors: [
      { path: "/process", label: "Process", title: "Observation, experiment, edit.", lead: "A studio practice made visible through questions and materials.", focus: "From sketch to sequence", details: "Each work begins with a small question about form. A series of studies tests that question through material, composition, and deliberate pauses. The final selection is edited for clarity, not scale.", action: "Discuss a creative brief" },
      { path: "/commissions", label: "Commissions", title: "A considered way to collaborate.", lead: "Scope, rights, timeframe and review are agreed before new work begins.", focus: "What a commission requires", details: "A genuine commission would establish usage rights, an agreed brief, a schedule, and the number of review rounds in writing. The work shown here is fictional demonstration material.", action: "Start an enquiry" },
    ],
  },
  haven: {
    homeSequence: ["hero", "feature", "story", "gallery", "contact"],
    heroVariant: "full-bleed",
    interiors: [
      { path: "/rooms", label: "Rooms", title: "Spaces for a slower stay.", lead: "Compare the character of sample rooms without confusing a demo for live availability.", focus: "Choose the experience", details: "The illustrative accommodation guide describes room atmosphere, accessibility questions and what to confirm before a stay. It is not a booking calendar or a rate quote.", action: "Ask about a room" },
      { path: "/booking-enquiry", label: "Enquiries", title: "Plan a visit with care.", lead: "Send an enquiry to the real property after verified contact information is configured.", focus: "Before you travel", details: "Confirm dates, guest capacity, access requirements, transport, cancellation terms and final pricing directly with the operator. This example does not reserve rooms or take payments.", action: "Contact the property" },
    ],
  },
  academia: {
    homeSequence: ["hero", "index", "chapters", "story", "contact"],
    heroVariant: "offset",
    interiors: [
      { path: "/admissions", label: "Admissions", title: "A clearer path to apply.", lead: "Practical guidance about academic enquiries, entry information, and next steps.", focus: "Before applying", details: "A real institution must publish its verified accreditation status, programme entry criteria, term dates and official application route. This fictional design does not accept applications or fees.", action: "Request information" },
      { path: "/student-life", label: "Student life", title: "Learning beyond the classroom.", lead: "An editorial introduction to clubs, shared spaces and community projects.", focus: "Support and belonging", details: "A complete school website should provide accurate accessibility information, safeguarding contacts, campus support and an up-to-date calendar. These examples are illustrative.", action: "Ask a question" },
    ],
  },
  maison: {
    homeSequence: ["hero", "gallery", "feature", "story", "contact"],
    heroVariant: "full-bleed",
    interiors: [
      { path: "/lookbook", label: "Lookbook", title: "Silhouette, material, movement.", lead: "An editorial collection told through shape and texture, not a pretend checkout.", focus: "The collection story", details: "Objects and looks in this demonstration are fictional. A real catalogue must present genuine products, accurate availability, verified sizes and usage rights for all visual assets.", action: "Enquire about a piece" },
      { path: "/care-guide", label: "Care", title: "Made to be kept.", lead: "Thoughtful aftercare information belongs alongside visual presentation.", focus: "Care before claims", details: "A live brand should publish verified fibre composition, cleaning guidance, warranty and returns information. This example does not make product guarantees.", action: "Ask about materials" },
    ],
  },
  nexus: {
    homeSequence: ["hero", "chapters", "feature", "gallery", "contact"],
    heroVariant: "typographic",
    interiors: [
      { path: "/documentation", label: "Documentation", title: "Understand the system before adopting it.", lead: "A calm technical reading room for capabilities, limits and system design.", focus: "Start with contracts", details: "Documentation in this example explains an illustrative workflow, not a real API endpoint. Production documentation should include exact versioned schemas, authentication, error behaviour, and rate limits.", action: "Request technical details" },
      { path: "/integrations", label: "Integrations", title: "Connections with clear boundaries.", lead: "Show how data might move through a product without inventing live connectors.", focus: "Define the handshake", details: "A genuine integration requires permissions, token handling, tenant scoping, error recovery, observability and supported provider contracts. This demonstration does not connect to external systems.", action: "Discuss integration needs" },
    ],
  },
  impact: {
    homeSequence: ["hero", "story", "chapters", "gallery", "contact"],
    heroVariant: "offset",
    interiors: [
      { path: "/volunteer", label: "Volunteer", title: "Begin with a useful contribution.", lead: "A transparent route to volunteering and shared community work.", focus: "Opportunities and safeguarding", details: "A real charity should identify current roles, application criteria, safeguarding procedures and a verified contact. This sample does not collect volunteering applications.", action: "Ask about participating" },
      { path: "/accountability", label: "Accountability", title: "Share evidence, not invented impact.", lead: "Trust requires documented results and clear stewardship of donated resources.", focus: "What to publish", details: "A real organisation should publish dated reports, verified impact methodology, governance information and programme spending. This example contains no donation facility or fabricated statistics.", action: "Request an update" },
    ],
  },
  estate: {
    homeSequence: ["hero", "gallery", "feature", "story", "contact"],
    heroVariant: "full-bleed",
    interiors: [
      { path: "/viewings", label: "Viewings", title: "A considered first look.", lead: "Help visitors prepare questions without pretending properties are available.", focus: "Before a viewing", details: "A real agency should verify ownership or instruction to market, accessibility details, price, location, current availability and identity of the contact. This example books no appointments.", action: "Send a viewing enquiry" },
      { path: "/area-guide", label: "Area guide", title: "Look beyond the front door.", lead: "A neighbourhood guide to amenities, movement and everyday context.", focus: "Understand the setting", details: "Transport, schools, local services and costs can change. Confirm all area details from current authoritative sources before presenting a real listing.", action: "Ask about the neighbourhood" },
    ],
  },
};

/** Apply curated flagship structures to a validated generator candidate.
 * This changes only content/section definition data; renderer, editor and
 * publication continue to use the existing Phase 13 contract.
 */
export function refineFlagship(base: PremiumLayout): PremiumLayout {
  const name = base.layoutId.slice("lucia.layout.".length);
  const direction = directions[name];
  if (!direction) return base;
  const draft = structuredClone(base);
  // Immersive hospitality, fashion and property compositions require a
  // deliberate full-width canvas rather than the generic reading measure.
  if (name === "haven" || name === "maison" || name === "estate")
    draft.tokens.width = "wide";
  const home = draft.pages.find((page) => page.path === "/");
  const portfolio = draft.pages.find((page) => page.id === "portfolio");
  if (!home || !portfolio) throw Error("Flagship requires homepage and portfolio");
  const keys = ["hero", "index", "chapters", "gallery", "story", "feature", "contact"] as const;
  const allSections = draft.pages.flatMap((page) => page.sections);
  const map = new Map(keys.map((key) => {
    const original = home.sections.find((section) => section.id === "home-" + key);
    const fallback = allSections.find((section) => section.id.endsWith("-" + key));
    const section = original ?? (fallback ? { ...fallback, id: "home-" + key } : undefined);
    return [key, section] as const;
  }));
  home.sections = direction.homeSequence.map((key) => {
    const section = map.get(key);
    if (section) return section;
    if (key === "index") {
      const offering = draft.pages.flatMap((page) => page.sections)
        .find((item) => item.type === "service-journey");
      if (offering?.type === "service-journey")
        return { id: "home-index", type: "trust-strip", variant: "inline",
          items: offering.items.map((item) => item.title) } satisfies PremiumSection;
    }
    throw Error("Missing flagship section " + key);
  });
  const hero = home.sections.find((section) => section.type === "premium-hero");
  const gallery = portfolio.sections.find((section) => section.type === "project-gallery");
  const image = gallery?.type === "project-gallery" ? gallery.projects[0]?.image : undefined;
  if (!hero || hero.type !== "premium-hero" || !image)
    throw Error("Flagship hero artwork not available");
  const heroArtwork = {
    src: "builtin:premium/flagship-" + name,
    alt: "Original editorial illustration developed for the " + name + " Layout"
  };
  const projectImages = [
    { src: "builtin:premium/project-" + name,
      alt: "Original " + name + " editorial project illustration" },
    { src: "builtin:premium/flagship-" + name,
      alt: "Original " + name + " brand illustration" },
    image,
  ];
  for (const existingPage of draft.pages) {
    for (const section of existingPage.sections) {
      if (section.type !== "project-gallery") continue;
      if (name === "canvas") section.heading = "Selected works";
      section.projects = section.projects.map((project, i) => ({
        ...project, image: projectImages[i % projectImages.length],
      }));
    }
  }
  hero.variant = direction.heroVariant;
  if (hero.variant === "full-bleed" || hero.variant === "offset")
    hero.image = heroArtwork;
  else delete hero.image;
  for (const [index, interior] of direction.interiors.entries()) {
    const id = "flagship-" + (index + 1);
    const sections: PremiumSection[] = [
      {
        id: id + "-hero", type: "premium-hero",
        variant: index === 0 ? "typographic" : "offset",
        eyebrow: interior.label + " / Demonstration",
        heading: interior.title, body: interior.lead,
        action: { href: "/contact", label: interior.action },
        ...(index !== 0 ? { image } : {}),
      },
      {
        id: id + "-story", type: "editorial-story",
        variant: index === 0 ? "split" : "narrow",
        heading: interior.focus, body: interior.details,
        ...(index === 0 ? { image } : {}),
      },
      {
        id: id + "-contact", type: "contact-panel",
        variant: "minimal", heading: "Continue the conversation.",
        body: "Fictional Layout example. Confirm all details and set genuine business contact information before publishing.",
        email: "hello@example.com",
      },
    ];
    draft.pages.push({
      id, path: interior.path, title: interior.title,
      description: interior.lead, navigation: true, sections,
      responsive: index === 0 ? "asymmetric" : "stack",
    });
    draft.navigation.splice(draft.navigation.length - 1, 0, {
      href: interior.path, label: interior.label,
    });
  }
  return parsePremiumLayout(draft);
}
