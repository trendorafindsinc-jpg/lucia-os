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
    ...(id === "home-hero" || id === "about-hero"
      ? {
          image: {
            src: "builtin:meridian/portrait",
            alt: "Generated editorial portrait illustrating a fictional advisory practice",
          },
        }
      : {}),
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
          src: "builtin:meridian/service-journey",
          alt: "Generated image of a calm reception space, illustrating a service-design scenario",
        },
        href: "/work/service-journey",
      },
      {
        title: "Choosing what matters",
        description:
          "An illustrative strategy scenario: make the choices, assumptions and next steps explicit.",
        image: {
          src: "builtin:meridian/direction",
          alt: "Generated still life of a plan, notebook and brass ruler",
        },
        href: "/work/strategic-direction",
      },
      {
        title: "A rhythm for everyday work",
        description:
          "An illustrative operating-model scenario: turn a direction into shared responsibilities.",
        image: {
          src: "builtin:meridian/operations",
          alt: "Generated architectural passage with repeated columns and natural light",
        },
        href: "/work/operating-rhythm",
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
          "Independent thinking for organisations shaping their next chapter. We bring perspective to complex decisions — and work with you to make progress practical.",
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
  definitions.splice(
    4,
    0,
    {
      id: "direction-case",
      path: "/work/strategic-direction",
      title: `Choosing what matters — ${siteName}`,
      description:
        "An illustrative strategy case: make the choices and assumptions visible.",
      sections: [
        hero(
          "direction-hero",
          "A shared direction, not another document.",
          "Illustrative scenario / Strategy. A fictional organisation needs to make priorities clear while preserving the work that already matters.",
        ),
        {
          id: "direction-image",
          type: "experience",
          variant: "editorial",
          heading: "Make the important choices visible.",
          body: "Generated illustrative image. This is not a photograph of a client engagement.",
          image: {
            src: "builtin:meridian/direction",
            alt: "Generated planning still life with a notebook and brass ruler",
          },
        },
        story(
          "direction-question",
          "What deserves attention now?",
          "Teams can have a long list of good ideas and still disagree about the next step. In this scenario, the task is to define the few choices that change how time, attention and resources are used.",
        ),
        story(
          "direction-method",
          "Name the trade-offs",
          "Bring the people responsible for delivery into the conversation. Record the alternatives, make assumptions visible and agree what the organisation will stop doing as well as what it will start.",
        ),
        story(
          "direction-evidence",
          "Evidence to review",
          "A real engagement would document its baseline, decision owners and review dates. This fictional example deliberately makes no claim about revenue, growth or actual client outcomes.",
        ),
        contact("direction-contact"),
      ],
    },
    {
      id: "operations-case",
      path: "/work/operating-rhythm",
      title: `An operating rhythm — ${siteName}`,
      description:
        "An illustrative operating-model case about ownership and practical routines.",
      sections: [
        hero(
          "operations-hero",
          "A way of working that supports the work.",
          "Illustrative scenario / Operating model. A fictional organisation wants clearer ownership without adding unnecessary process.",
        ),
        {
          id: "operations-image",
          type: "experience",
          variant: "editorial",
          heading: "Create a structure people can use.",
          body: "Generated architectural illustration, not an actual client property.",
          image: {
            src: "builtin:meridian/operations",
            alt: "Generated covered passage and courtyard in warm morning light",
          },
        },
        story(
          "operations-question",
          "Where does work get stuck?",
          "Look at the hand-offs between teams, the decisions that wait for approval and the information people need to do their jobs. Begin with the actual work rather than an idealised organisation chart.",
        ),
        story(
          "operations-method",
          "Define a practical rhythm",
          "Agree responsibilities, a short set of working routines and a clear escalation path. Test the approach with one real workflow before expanding it. Keep the process proportionate to the problem.",
        ),
        story(
          "operations-evidence",
          "What would count as progress?",
          "In a real case, agreed measures might include the time needed to make a decision or the quality of a hand-off. No measured improvement is invented for this demonstration.",
        ),
        contact("operations-contact"),
      ],
    },
    {
      id: "about",
      path: "/about",
      title: `About — ${siteName}`,
      description: "A human, independent approach to advisory work.",
      sections: [
        hero(
          "about-hero",
          "Independent perspective. Shared ownership.",
          "A demonstration of an advisory practice built around thoughtful questions, clear choices and the people who carry them forward.",
        ),
        story(
          "about-principles",
          "Stay close to the people and the problem",
          "Good recommendations should be understandable to the people expected to act on them. Our sample approach combines independent thinking with practical collaboration, leaving a clear record of choices and assumptions.",
        ),
        story(
          "about-demo",
          "A fictional practice, clearly presented",
          "Meridian is a demonstration website. Its portrait and project images are generated illustrations, not actual advisors, client properties or proof of commercial results. Replace the sample content with your own verified business information.",
        ),
        contact("about-contact"),
      ],
    },
  );
  definitions.push({
    id: "privacy",
    path: "/privacy",
    title: `Demonstration privacy notice — ${siteName}`,
    description:
      "How the demonstration contact links work and what to replace before launch.",
    sections: [
      hero(
        "privacy-hero",
        "Clear expectations about contact.",
        "Demonstration notice — replace this text with the policy that accurately describes your own business before launch.",
      ),
      story(
        "privacy-contact",
        "Email links, not a submission form",
        "The contact action opens your own email application. This design does not submit enquiry messages to a built-in customer database or activate an analytics integration. Your email provider handles any message you choose to send.",
      ),
      story(
        "privacy-launch",
        "Before you publish your own business",
        "Use a contact address you control. Describe the information your organisation actually collects, the services it uses and how customers can contact it about their data. This sample is not a completed policy for your business.",
      ),
      contact("privacy-details"),
    ],
  });
  return parsePremiumLayout({
    schema: "lucia.layout-composition",
    version: 2,
    layoutId: "lucia.layout.meridian",
    layoutVersion: 2,
    category: "Business & Professional Services",
    identity: {
      name: siteName,
      description:
        "Fictional advisory demonstration. Portrait and project images are generated illustrations, not actual advisors, clients or results.",
    },
    tokens: {
      background: "#F5F1E8",
      foreground: "#10263D",
      accent: "#9D793B",
      font: "system-sans",
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
      { label: "About", href: "/about" },
      { label: "Perspectives", href: "/insights" },
      { label: "Contact", href: "/contact" },
      { label: "Privacy", href: "/privacy" },
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
