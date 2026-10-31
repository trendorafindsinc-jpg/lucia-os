import {
  parsePremiumLayout,
  type PremiumSection,
} from "../premium-composition";

/** Phase 14 batch-one candidate. Fictional sample business, not accepted premium delivery. */
export function meridianCandidate(siteName = "Meridian Advisory · Demo") {
  const hero = (
    id: string,
    heading: string,
    body: string,
    href = "/contact",
  ): PremiumSection => ({
    id,
    type: "premium-hero",
    variant: "offset",
    eyebrow: "Independent advisory / Demonstration",
    heading,
    body,
    image: {
      src: "builtin:premium/flagship-meridian",
      alt: "Original editorial illustration developed for the Meridian advisory Layout",
    },
    action: {
      label:
        href === "/contact"
          ? "Start a conversation"
          : "Read the illustrative case",
      href,
    },
  });
  const story = (
    id: string,
    heading: string,
    body: string,
  ): PremiumSection => ({
    id,
    type: "editorial-story",
    variant: "narrow",
    heading,
    body,
  });
  const contact = (id: string): PremiumSection => ({
    id,
    type: "contact-panel",
    variant: "split",
    heading: "Your next chapter starts with a clear conversation.",
    body: "This is a fictional advisory practice. Replace this demonstration address with your own before inviting enquiries.",
    email: "hello@example.com",
  });
  const services: PremiumSection = {
    id: "home-services",
    type: "service-journey",
    variant: "chapters",
    heading: "Clarity, carried through to action.",
    items: [
      {
        title: "Direction",
        body: "Bring your leadership team around a clear view of the decisions that matter, the trade-offs involved and the work ahead.",
      },
      {
        title: "Service design",
        body: "Understand the moments that shape your customers' experience, then turn that understanding into a service your team can deliver.",
      },
      {
        title: "Operating models",
        body: "Align responsibilities, working rhythms and practical measures so the strategy survives contact with everyday work.",
      },
    ],
  };
  const cases: PremiumSection = {
    id: "home-work",
    type: "project-gallery",
    variant: "rail",
    heading: "Illustrative work. Practical questions.",
    projects: [
      {
        title: "A clearer service journey",
        description:
          "A fictional case demonstrating how research becomes an actionable service blueprint.",
        image: {
          src: "builtin:premium/project-meridian",
          alt: "Original architectural composition representing a fictional service-design case",
        },
        href: "/work/service-journey",
      },
    ],
  };
  const definitions = [
    {
      id: "home",
      path: "/",
      title: siteName,
      description:
        "Independent advice, thoughtful service design and practical operating models.",
      sections: [
        hero(
          "home-hero",
          "Decisions with direction.",
          "Independent thinking for organisations shaping their next chapter. A demonstration of a measured, human approach to advisory work.",
        ),
        {
          id: "home-focus",
          type: "trust-strip",
          variant: "inline",
          items: [
            "Strategy & positioning",
            "Service design",
            "Operating models",
          ],
        },
        services,
        cases,
        contact("home-contact"),
      ],
    },
    {
      id: "services",
      path: "/services",
      title: `Services — ${siteName}`,
      description:
        "Explore strategy, service design and operating-model advisory.",
      sections: [
        hero(
          "services-hero",
          "Good advice makes the next step clearer.",
          "Start with the question in front of you. Work with a focused team to understand it, make a choice and carry that choice into practice.",
        ),
        { ...services, id: "services-chapters" },
        story(
          "services-method",
          "Work with the people closest to the problem.",
          "Our sample engagement model combines listening, shared working sessions and clear written recommendations. Scope, fees and responsibilities should be agreed before any real engagement begins.",
        ),
        contact("services-contact"),
      ],
    },
    {
      id: "work",
      path: "/work",
      title: `Illustrative work — ${siteName}`,
      description:
        "Explore a fictional service-design case and its evidence framework.",
      sections: [
        hero(
          "work-hero",
          "The work behind the recommendation.",
          "These are clearly labelled fictional scenarios, not client testimonials or claims about actual commercial results.",
          "/work/service-journey",
        ),
        { ...cases, id: "work-index" },
        contact("work-contact"),
      ],
    },
    {
      id: "service-case",
      path: "/work/service-journey",
      title: `A clearer service journey — ${siteName}`,
      description:
        "A fictional case: problem, approach, evidence and implementation decisions.",
      sections: [
        hero(
          "case-hero",
          "From disconnected touchpoints to a considered journey.",
          "Fictional case study / Service design. This example explains a process; it does not claim a real client engagement or a measured result.",
        ),
        story(
          "case-problem",
          "The question",
          "A growing practice wants to make enquiries easier to handle without losing the personal attention that makes its service valuable. Where should it begin?",
        ),
        story(
          "case-approach",
          "The approach",
          "Map the enquiry journey with the people who deliver it. Identify repeated hand-offs, unclear expectations and information that arrives too late. Test a simpler service blueprint before changing the full operation.",
        ),
        story(
          "case-evidence",
          "Evidence before claims",
          "In a real case, consented research, a documented baseline and agreed measures would support any claim about outcomes. This demonstration deliberately contains no invented statistics or client endorsements.",
        ),
        contact("case-contact"),
      ],
    },
    {
      id: "insights",
      path: "/insights",
      title: `Perspectives — ${siteName}`,
      description:
        "A considered perspective on making strategy useful in everyday work.",
      sections: [
        hero(
          "insights-hero",
          "A useful idea should change what you do next.",
          "Demonstration editorial / A perspective on making strategic choices practical, explicit and shared.",
        ),
        story(
          "insights-essay",
          "Make the decision visible",
          "A strategy becomes useful when a team can explain what it will prioritise, what it will decline and how it will know whether the choice is working. Start with one consequential decision. Record its assumptions. Agree a moment to revisit the evidence.",
        ),
        contact("insights-contact"),
      ],
    },
    {
      id: "contact",
      path: "/contact",
      title: `Contact — ${siteName}`,
      description:
        "Contact details and clear expectations for an advisory conversation.",
      sections: [
        hero(
          "contact-hero",
          "Begin with the question you are trying to answer.",
          "This fictional example includes a demonstration email link, not a working enquiry form. Replace the address with verified business contact details.",
        ),
        contact("contact-details"),
      ],
    },
  ];
  return parsePremiumLayout({
    schema: "lucia.layout-composition",
    version: 2,
    layoutId: "lucia.layout.meridian",
    layoutVersion: 2,
    category: "Business & Professional Services",
    identity: {
      name: siteName,
      description:
        "Fictional executive advisory practice. Phase 14 design candidate awaiting visual, asset and publishing acceptance.",
    },
    tokens: {
      background: "#F5F1E8",
      foreground: "#10263D",
      accent: "#9D793B",
      font: "editorial-serif",
      scale: "balanced",
      width: "standard",
      radius: "square",
      rhythm: "measured",
      motion: "none",
    },
    navigation: [
      { label: "Home", href: "/" },
      { label: "Services", href: "/services" },
      { label: "Work", href: "/work" },
      { label: "Perspectives", href: "/insights" },
      { label: "Contact", href: "/contact" },
    ],
    pages: definitions.map((p) => ({
      ...p,
      navigation: true,
      responsive: p.id === "home" ? "asymmetric" : "stack",
    })),
    permissions: {
      guided: ["text", "image", "link", "brand", "contact", "reorder"],
      advanced: [
        "variant",
        "tokens",
        "section-order",
        "page-responsive",
        "section-structure",
        "pages",
      ],
      lockedSections: ["home-hero", "home-services", "home-work"],
      lockedTokens: ["font", "scale", "width", "rhythm"],
    },
  });
}
