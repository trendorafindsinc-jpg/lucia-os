import {
  parsePremiumLayout,
  type PremiumLayout,
  type PremiumSection,
} from "../premium-composition";

/** Editorially authored flagship expansion. Structural content is
 * demonstrative and cannot be represented as a working service, verified
 * institution, or licensed photography.
 */
import { flagshipEditorial } from "./flagship-editorial";

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
  const editorial = flagshipEditorial[name];
  draft.layoutVersion = 2;
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
    src: ["haven", "maison", "estate"].includes(name) ? "builtin:premium/photograph-" + name : "builtin:premium/flagship-" + name,
    alt: ["haven", "maison", "estate"].includes(name) ? "Generated fictional " + name + " editorial photograph; not an actual property or available product" : "Original editorial illustration developed for the " + name + " Layout"
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
  if (editorial) {
    draft.identity.description = "Fictional " + name + " demonstration. Original illustration and generated imagery; no real clients, products, properties or results are claimed.";
    for (const page of draft.pages) {
      for (const section of page.sections) {
        if (section.type === "project-gallery") { section.heading = editorial.portfolioHeadline; section.projects = section.projects.map((item, i) => ({ ...item, description: editorial.cases[i % 3] })); }
        if (section.type === "experience") {
          const index = gallery?.type === "project-gallery" ? gallery.projects.findIndex((project) => section.heading.toLowerCase().includes(project.title.toLowerCase())) : 0;
          section.body = editorial.cases[Math.max(0, index) % 3];
        }
        if (section.type === "contact-panel") section.body = "Tell us what you have in mind using the enquiry address below. This is a fictional design demonstration; no booking, purchase or application is made by sending a message.";
        if (section.type === "service-journey") section.items = section.items.map((item, i) => ({ ...item, body: editorial.offers[i % 3] }));
        if (section.type === "editorial-story") section.body = page.id.startsWith("study-") && !section.id.endsWith("-method") ? editorial.cases[(Number(page.id.slice(6)) - 1) % 3] : editorial.story;
        if (section.type === "premium-hero") {
          section.body = page.id.startsWith("study-") ? editorial.cases[(Number(page.id.slice(6)) - 1) % 3] : editorial.lead;
          if (page.id === "offerings") section.heading = editorial.offerHeadline;
          if (page.id === "portfolio") section.heading = editorial.portfolioHeadline;
        }
      }
    }
  }
  for (const [index, originalInterior] of direction.interiors.entries()) {
    const interior = { ...originalInterior, ...editorial?.pages[originalInterior.path] };
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
    const comparisons: Record<string, { heading: string; items: { title: string; body: string }[] }> = {
      "/rooms": { heading: "Three room concepts, compared", items: [
        { title: "Garden Room", body: "An intimate room concept with a reading chair and a sheltered garden outlook. Ask about the actual bed configuration, step-free access and guest capacity." },
        { title: "Courtyard Suite", body: "A suite concept that separates a sitting area from the sleeping space, with a quieter inward-facing outlook. Confirm the real floor plan and facilities before booking." },
        { title: "Terrace Studio", body: "A more open studio concept connected to a private outdoor sitting area. Terrace access, safety features and availability must be confirmed directly." },
      ] },
      "/admissions": { heading: "From first question to a clear next step", items: [
        { title: "Explore a subject", body: "Read the programme introduction and identify the topics you want to study in greater depth." },
        { title: "Prepare your questions", body: "Make a note of your background, preferred timing, access requirements and the information you still need." },
        { title: "Contact admissions", body: "Use the configured enquiry address to ask about suitability, official entry requirements and the application process." },
        { title: "Confirm the details", body: "Check recognised status, dates, fees and the formal offer directly with the real institution. This demonstration issues no admissions decisions." },
      ] },
      "/process": { heading: "Question. Study. Edit.", items: [
        { title: "Find the question", body: "Gather references and define what the work needs to communicate before deciding what it should look like." },
        { title: "Make the studies", body: "Explore several directions through small experiments. Compare what each one makes possible rather than selecting a finish too early." },
        { title: "Edit for clarity", body: "Develop the selected direction, test it in its intended formats and remove details that distract from the central idea." },
      ] },
      "/care-guide": { heading: "A considered approach to aftercare", items: [
        { title: "Read the label", body: "Follow the instructions attached to the actual garment. Fibre blends and construction can require different treatment." },
        { title: "Use the gentlest suitable method", body: "Avoid unnecessary heat or friction, and consult a specialist for delicate finishes or unfamiliar fabrics." },
        { title: "Store with care", body: "Keep garments clean and dry, support their shape and protect sensitive materials from prolonged direct light." },
      ] },
      "/documentation": { heading: "Three boundaries worth documenting", items: [
        { title: "Information", body: "Name required inputs, supported states and expected outputs. Keep the meaning of each field separate from its display." },
        { title: "Authority", body: "Define who can read or change the information, and recheck that authority when an operation is performed." },
        { title: "Recovery", body: "Describe retries, conflicts and partial failure so an interrupted workflow has a predictable next step." },
      ] },
      "/accountability": { heading: "An evidence-led reporting cycle", items: [
        { title: "Listen", body: "Record the questions that shape a proposed activity and make room for different perspectives." },
        { title: "Document", body: "Keep a dated account of decisions, responsibilities and the resources committed." },
        { title: "Review", body: "Separate observed results from assumptions and explain the limits of the available evidence." },
        { title: "Report", body: "Share a clear account of what happened, what was learned and which questions remain open. No fabricated outcomes are shown here." },
      ] },
      "/area-guide": { heading: "Look at an ordinary week", items: [
        { title: "Everyday journeys", body: "Explore the routes you would use regularly. Check current transport information and consider different times of day." },
        { title: "Useful nearby services", body: "Identify the shops, healthcare, learning and other facilities relevant to your needs; verify current details directly." },
        { title: "The wider setting", body: "Spend time in the neighbourhood and ask about access, shared spaces and practical responsibilities before making a decision." },
      ] },
    };
    const comparison = comparisons[interior.path];
    if (comparison) sections.splice(2, 0, { id: id + "-guide", type: "service-journey", variant: ["/admissions", "/accountability", "/care-guide"].includes(interior.path) ? "chapters" : "columns", ...comparison });
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
