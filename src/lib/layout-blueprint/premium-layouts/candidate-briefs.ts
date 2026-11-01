/* Phase 14 authored briefs. Demonstration content is fictional; none is accepted.
 * The unique briefs are intentionally separate from the runtime renderer and
 * never treated as customer assets or credentials. */
export type PremiumCandidateBrief = {
  category: number;
  id: string;
  name: string;
  title: string;
  pitch: string;
  offers: string[];
  projects: string[];
  story: string;
  colors: { background: string; foreground: string; accent: string };
};
export const premiumCandidateBriefs: readonly PremiumCandidateBrief[] = [
  {
    "category": 0,
    "id": "keystone",
    "name": "Keystone",
    "title": "Space shaped around people.",
    "pitch": "A fictional architecture studio translates site, light and material into considered places.",
    "offers": [
      "Site studies",
      "Spatial planning",
      "Material palettes"
    ],
    "projects": [
      "Courtyard sequence",
      "Light study",
      "Adaptive workspace"
    ],
    "story": "Every commission begins by observing how people move through a place and what the site can support.",
    "colors": {
      "background": "#EFECE6",
      "foreground": "#20282B",
      "accent": "#967D60"
    }
  },
  {
    "category": 0,
    "id": "verity",
    "name": "Verity",
    "title": "Counsel with clarity and care.",
    "pitch": "A fictional legal practice explains its work in calm, accessible language without promises of outcomes.",
    "offers": [
      "Business guidance",
      "Dispute preparation",
      "Private consultations"
    ],
    "projects": [
      "Matter intake",
      "Advisory method",
      "Client information"
    ],
    "story": "Legal matters deserve precise explanations and a consultation process built on confidentiality.",
    "colors": {
      "background": "#F5F0E9",
      "foreground": "#382C2A",
      "accent": "#886A52"
    }
  },
  {
    "category": 0,
    "id": "summit",
    "name": "Summit",
    "title": "Decisions that move teams forward.",
    "pitch": "An illustrative consulting practice focuses on strategy, aligned teams and practical execution.",
    "offers": [
      "Strategic direction",
      "Team alignment",
      "Operating change"
    ],
    "projects": [
      "Decision workshop",
      "Operating rhythm",
      "Leadership session"
    ],
    "story": "Useful advice makes priorities explicit, names trade-offs and identifies the next accountable action.",
    "colors": {
      "background": "#F2F3EC",
      "foreground": "#17334E",
      "accent": "#D07E37"
    }
  },
  {
    "category": 0,
    "id": "foundry",
    "name": "Foundry",
    "title": "Built for demanding work.",
    "pitch": "A fictional industrial engineering company presents its capabilities and safe project approach.",
    "offers": [
      "Fabrication planning",
      "Equipment servicing",
      "Site coordination"
    ],
    "projects": [
      "Workshop capacity",
      "Maintenance approach",
      "Logistics planning"
    ],
    "story": "From drawings to handover, every step needs clear ownership, documented checks and honest delivery schedules.",
    "colors": {
      "background": "#EDEAE1",
      "foreground": "#30312D",
      "accent": "#A45C35"
    }
  },
  {
    "category": 0,
    "id": "civic",
    "name": "Civic",
    "title": "Public information, made understandable.",
    "pitch": "An illustrative civic-service organisation makes processes and public guidance easier to follow.",
    "offers": [
      "Service guidance",
      "Community information",
      "Public notices"
    ],
    "projects": [
      "Application guide",
      "Access assistance",
      "Information desk"
    ],
    "story": "A public-facing service should help people identify the correct next step without hidden assumptions.",
    "colors": {
      "background": "#F4F7F5",
      "foreground": "#174A53",
      "accent": "#317C8D"
    }
  },
  {
    "category": 1,
    "id": "canvas",
    "name": "Canvas",
    "title": "A quieter way to see the work.",
    "pitch": "An independent artist portfolio that gives each body of work room to speak.",
    "offers": [
      "Selected works",
      "Studio practice",
      "Exhibitions"
    ],
    "projects": [
      "Studies in form",
      "A material dialogue",
      "The open canvas"
    ],
    "story": "The portfolio is arranged as a series of close readings rather than a wall of promotional cards.",
    "colors": {
      "background": "#FAFAF6",
      "foreground": "#252525",
      "accent": "#B59B7A"
    }
  },
  {
    "category": 1,
    "id": "prism",
    "name": "Prism",
    "title": "Type, image, unexpected order.",
    "pitch": "A fictional experimental design studio explores typography as material and composition as argument.",
    "offers": [
      "Visual identities",
      "Poster experiments",
      "Editorial systems"
    ],
    "projects": [
      "Variable letterforms",
      "A sequence of posters",
      "The public page"
    ],
    "story": "Each project begins with a question about what a viewer notices first and what remains after.",
    "colors": {
      "background": "#F5F2EA",
      "foreground": "#1D1642",
      "accent": "#EF4D64"
    }
  },
  {
    "category": 1,
    "id": "atelier",
    "name": "Atelier",
    "title": "Made slowly. Considered deeply.",
    "pitch": "A demonstration of an editorial craft studio working through material, image and writing.",
    "offers": [
      "Material exploration",
      "Art direction",
      "Published stories"
    ],
    "projects": [
      "Paper and light",
      "The maker's table",
      "An editorial study"
    ],
    "story": "Process is shown as decisions and iterations, not as an invented list of prestigious clients.",
    "colors": {
      "background": "#F4E8DB",
      "foreground": "#4C302A",
      "accent": "#A7664B"
    }
  },
  {
    "category": 1,
    "id": "monograph",
    "name": "Monograph",
    "title": "A practice in careful observation.",
    "pitch": "A fictional writer-designer portfolio organised around essays and case narratives.",
    "offers": [
      "Editorial essays",
      "Identity systems",
      "Research notes"
    ],
    "projects": [
      "The archive",
      "A quiet identity",
      "Printed matter"
    ],
    "story": "Longform work gains meaning from context, considered typography and transparent authorship.",
    "colors": {
      "background": "#F7F5EE",
      "foreground": "#21211F",
      "accent": "#716B60"
    }
  },
  {
    "category": 1,
    "id": "frame",
    "name": "Frame",
    "title": "Stories held in a frame.",
    "pitch": "A demonstration photography portfolio presents image sequences and project context.",
    "offers": [
      "Portrait studies",
      "Place and landscape",
      "Editorial series"
    ],
    "projects": [
      "Window light",
      "Coastal forms",
      "An ordinary day"
    ],
    "story": "Photography here is presented as fictional study material, not commissioned client work.",
    "colors": {
      "background": "#171B23",
      "foreground": "#F6F2E8",
      "accent": "#C3A276"
    }
  },
  {
    "category": 1,
    "id": "muse",
    "name": "Muse",
    "title": "An imagination in full colour.",
    "pitch": "A fictional illustrator introduces playful image-making and the ideas behind each collection.",
    "offers": [
      "Illustration series",
      "Character studies",
      "Book concepts"
    ],
    "projects": [
      "A garden of shapes",
      "Small companions",
      "Night pages"
    ],
    "story": "The drawn world invites curiosity while making the commissioning process easy to understand.",
    "colors": {
      "background": "#FFF3EA",
      "foreground": "#392F58",
      "accent": "#D66A84"
    }
  },
  {
    "category": 2,
    "id": "savour",
    "name": "Savour",
    "title": "An evening worth sharing.",
    "pitch": "A fictional restaurant website built around its sample menu, kitchen philosophy and enquiry details.",
    "offers": [
      "Seasonal plates",
      "Kitchen stories",
      "Private dining"
    ],
    "projects": [
      "A sample supper",
      "The kitchen table",
      "Shared celebrations"
    ],
    "story": "The menu and dining experiences are demonstrations; no tables are bookable through this sample.",
    "colors": {
      "background": "#261D1A",
      "foreground": "#F6EBDD",
      "accent": "#D7A977"
    }
  },
  {
    "category": 2,
    "id": "haven",
    "name": "Haven",
    "title": "A place to feel at home.",
    "pitch": "An illustrative boutique retreat presents rooms, surroundings and a clear booking-enquiry route.",
    "offers": [
      "Rooms and suites",
      "Local experiences",
      "Guest information"
    ],
    "projects": [
      "Garden room",
      "Morning courtyard",
      "The reading lounge"
    ],
    "story": "Rooms and descriptions are sample material, not live hotel availability or confirmed rates.",
    "colors": {
      "background": "#ECE8DD",
      "foreground": "#223E35",
      "accent": "#AF8659"
    }
  },
  {
    "category": 2,
    "id": "bloom",
    "name": "Bloom",
    "title": "Restore your own rhythm.",
    "pitch": "A fictional wellness practice explains calming rituals and practitioner-led appointments.",
    "offers": [
      "Restorative treatments",
      "Wellness rituals",
      "Practitioner introductions"
    ],
    "projects": [
      "A quiet ritual",
      "A consultation room",
      "The garden walk"
    ],
    "story": "Service descriptions are examples; this website does not supply medical advice or confirm bookings.",
    "colors": {
      "background": "#F0F1E7",
      "foreground": "#314C41",
      "accent": "#819976"
    }
  },
  {
    "category": 2,
    "id": "nomad",
    "name": "Nomad",
    "title": "Beyond the familiar horizon.",
    "pitch": "An illustrative travel studio introduces journeys through destination stories and responsible planning.",
    "offers": [
      "Destination research",
      "Journey planning",
      "Group itineraries"
    ],
    "projects": [
      "Highland passage",
      "A coastal route",
      "The trail notebook"
    ],
    "story": "Destinations are editorial examples, not departure dates, packages or available trips.",
    "colors": {
      "background": "#E9EEE9",
      "foreground": "#233B49",
      "accent": "#AD7757"
    }
  },
  {
    "category": 2,
    "id": "gather",
    "name": "Gather",
    "title": "For moments worth remembering.",
    "pitch": "A fictional event studio shares celebration concepts, planning stages and enquiries.",
    "offers": [
      "Event direction",
      "Venue styling",
      "Guest experience"
    ],
    "projects": [
      "An intimate gathering",
      "An outdoor ceremony",
      "A winter table"
    ],
    "story": "The gallery illustrates event concepts rather than real past client celebrations.",
    "colors": {
      "background": "#FBF3F0",
      "foreground": "#623F52",
      "accent": "#C58A89"
    }
  },
  {
    "category": 2,
    "id": "bistro",
    "name": "Bistro",
    "title": "The neighbourhood has a table.",
    "pitch": "A fictional casual cafe shares its sample food, community character and contact information.",
    "offers": [
      "Daytime menu",
      "Neighbourhood stories",
      "Location and hours"
    ],
    "projects": [
      "Coffee and morning",
      "The lunch board",
      "A community evening"
    ],
    "story": "Opening hours and menu items must be replaced with verified information before public use.",
    "colors": {
      "background": "#F8F2E4",
      "foreground": "#3F442E",
      "accent": "#B16F3D"
    }
  },
  {
    "category": 3,
    "id": "academia",
    "name": "Academia",
    "title": "Ideas begin here.",
    "pitch": "A fictional higher-learning institute introduces programmes, academic life and admissions guidance.",
    "offers": [
      "Academic programmes",
      "Faculty introductions",
      "Admissions pathway"
    ],
    "projects": [
      "Learning spaces",
      "Research questions",
      "Community projects"
    ],
    "story": "Programmes are illustrative and do not represent accredited courses or admissions offers.",
    "colors": {
      "background": "#F4F2E9",
      "foreground": "#17364E",
      "accent": "#B59B61"
    }
  },
  {
    "category": 3,
    "id": "sprout",
    "name": "Sprout",
    "title": "Curiosity grows every day.",
    "pitch": "An illustrative early-learning school explains its play-based day and family communication.",
    "offers": [
      "Learning through play",
      "Daily routines",
      "Family conversations"
    ],
    "projects": [
      "A reading corner",
      "Outdoor discovery",
      "Creative mornings"
    ],
    "story": "All school information is fictional and must be replaced with verified safeguarding and enrolment details.",
    "colors": {
      "background": "#FFF9E7",
      "foreground": "#31534B",
      "accent": "#E5A653"
    }
  },
  {
    "category": 3,
    "id": "scholar",
    "name": "Scholar",
    "title": "A community of learners.",
    "pitch": "A fictional school website brings learning, activities and family information together.",
    "offers": [
      "Curriculum overview",
      "Student activities",
      "Family resources"
    ],
    "projects": [
      "Science day",
      "The library project",
      "Creative showcase"
    ],
    "story": "The school, events and programmes shown here are examples only.",
    "colors": {
      "background": "#F2F7F8",
      "foreground": "#183D62",
      "accent": "#D29149"
    }
  },
  {
    "category": 3,
    "id": "mentor",
    "name": "Mentor",
    "title": "Learn with purpose.",
    "pitch": "An illustrative independent tutor explains learning goals, teaching approach and enquiry steps.",
    "offers": [
      "One-to-one guidance",
      "Study plans",
      "Learning resources"
    ],
    "projects": [
      "A practice session",
      "Building confidence",
      "Independent study"
    ],
    "story": "This fictional tutor does not offer real sessions or confirmed qualifications.",
    "colors": {
      "background": "#F4F0E8",
      "foreground": "#332D51",
      "accent": "#A97965"
    }
  },
  {
    "category": 3,
    "id": "elevate",
    "name": "Elevate",
    "title": "New skills. Real direction.",
    "pitch": "A fictional skills academy introduces pathways and project-based learning without false employment promises.",
    "offers": [
      "Digital foundations",
      "Career skills",
      "Workshop projects"
    ],
    "projects": [
      "A prototype workshop",
      "Learning together",
      "Portfolio review"
    ],
    "story": "Course pathways are examples and do not guarantee jobs, credentials or enrolment.",
    "colors": {
      "background": "#101F32",
      "foreground": "#F8F4EB",
      "accent": "#50B7A1"
    }
  },
  {
    "category": 3,
    "id": "campus",
    "name": "Campus",
    "title": "Learning belongs to everyone.",
    "pitch": "A demonstration community college showcases facilities, clubs and campus news.",
    "offers": [
      "Student clubs",
      "Facilities",
      "Community events"
    ],
    "projects": [
      "Studio week",
      "A debate gathering",
      "Open library"
    ],
    "story": "Every listed event and facility is illustrative, not a confirmed public schedule.",
    "colors": {
      "background": "#EFF2ED",
      "foreground": "#25463E",
      "accent": "#7F9D77"
    }
  },
  {
    "category": 4,
    "id": "maison",
    "name": "Maison",
    "title": "A collection with a point of view.",
    "pitch": "A fictional fashion label presents editorial looks, fabric stories and product enquiries.",
    "offers": [
      "Seasonal looks",
      "Fabric stories",
      "Personal enquiries"
    ],
    "projects": [
      "The silhouette",
      "A study in texture",
      "Evening forms"
    ],
    "story": "The lookbook is illustrative; it has no inventory, payment checkout or order confirmation.",
    "colors": {
      "background": "#EDE4DC",
      "foreground": "#322A2D",
      "accent": "#AE816C"
    }
  },
  {
    "category": 4,
    "id": "origin",
    "name": "Origin",
    "title": "Thoughtfully made from the start.",
    "pitch": "A fictional natural-goods brand explains ingredients, sources and product-use information.",
    "offers": [
      "Ingredient stories",
      "Product collection",
      "Responsible practices"
    ],
    "projects": [
      "Botanical blend",
      "Everyday ritual",
      "Material origins"
    ],
    "story": "Ingredients and sustainability narratives are examples awaiting documented evidence.",
    "colors": {
      "background": "#F2F0DF",
      "foreground": "#30473C",
      "accent": "#8F9C5A"
    }
  },
  {
    "category": 4,
    "id": "object",
    "name": "Object",
    "title": "Less, but more considered.",
    "pitch": "A demonstration product-design brand presents objects as functional studies.",
    "offers": [
      "Object catalogue",
      "Design details",
      "Care information"
    ],
    "projects": [
      "A desk object",
      "The modular vessel",
      "A lighting study"
    ],
    "story": "Specifications and collections are fictional and not purchasable products.",
    "colors": {
      "background": "#F3F2ED",
      "foreground": "#282B2C",
      "accent": "#A3A09A"
    }
  },
  {
    "category": 4,
    "id": "harvest",
    "name": "Harvest",
    "title": "From the field to the table.",
    "pitch": "A fictional food-producer collective introduces seasonal produce and producer stories.",
    "offers": [
      "Seasonal produce",
      "Producer profiles",
      "Wholesale enquiries"
    ],
    "projects": [
      "The orchard",
      "Market morning",
      "A winter harvest"
    ],
    "story": "Produce listings are samples; stock, provenance and prices must be verified.",
    "colors": {
      "background": "#F6F2DF",
      "foreground": "#38503A",
      "accent": "#CD974E"
    }
  },
  {
    "category": 4,
    "id": "lustre",
    "name": "Lustre",
    "title": "A thoughtful everyday ritual.",
    "pitch": "An illustrative beauty brand presents sample routines and transparent product education.",
    "offers": [
      "Daily routines",
      "Product guide",
      "Ingredient literacy"
    ],
    "projects": [
      "Morning light",
      "The gentle cleanse",
      "A simple routine"
    ],
    "story": "No cosmetic outcome is promised; product descriptions are fictional demonstrations.",
    "colors": {
      "background": "#F9F0ED",
      "foreground": "#583948",
      "accent": "#C68A89"
    }
  },
  {
    "category": 4,
    "id": "craft",
    "name": "Craft",
    "title": "Made by hand and intention.",
    "pitch": "A fictional artisan workshop presents materials, makers and commission enquiries.",
    "offers": [
      "Studio-made objects",
      "Material sourcing",
      "Custom commissions"
    ],
    "projects": [
      "The ceramic form",
      "The joining detail",
      "A commissioned piece"
    ],
    "story": "Craft stories and products are examples, not items currently available to order.",
    "colors": {
      "background": "#F3EADC",
      "foreground": "#45392F",
      "accent": "#B77A56"
    }
  },
  {
    "category": 5,
    "id": "nexus",
    "name": "Nexus",
    "title": "Clarity for complex workflows.",
    "pitch": "A fictional SaaS platform explains capabilities through realistic product walkthroughs.",
    "offers": [
      "Workflow overview",
      "Team coordination",
      "Integration concepts"
    ],
    "projects": [
      "A shared dashboard",
      "Team handoff",
      "Configuration flow"
    ],
    "story": "Screens are demonstrations; no connected accounts or production integrations exist here.",
    "colors": {
      "background": "#F0F4FA",
      "foreground": "#20365C",
      "accent": "#5978C6"
    }
  },
  {
    "category": 5,
    "id": "orbit",
    "name": "Orbit",
    "title": "Intelligence in useful orbit.",
    "pitch": "An illustrative AI platform introduces technical concepts without claiming real model features.",
    "offers": [
      "AI use cases",
      "Responsible design",
      "Technical foundations"
    ],
    "projects": [
      "A research flow",
      "Human review",
      "A capability map"
    ],
    "story": "AI features are conceptual demonstrations and not a deployed AI service.",
    "colors": {
      "background": "#131B36",
      "foreground": "#F1F5FF",
      "accent": "#7B9DFF"
    }
  },
  {
    "category": 5,
    "id": "vector",
    "name": "Vector",
    "title": "Built for the people who build.",
    "pitch": "A fictional developer platform prioritises API clarity, architecture and safe adoption.",
    "offers": [
      "API concepts",
      "Architecture notes",
      "Getting started"
    ],
    "projects": [
      "A request lifecycle",
      "A typed contract",
      "A sandbox plan"
    ],
    "story": "The examples are not functional credentials, hosted APIs or live documentation.",
    "colors": {
      "background": "#F6F8FA",
      "foreground": "#1A3242",
      "accent": "#3F8C9D"
    }
  },
  {
    "category": 5,
    "id": "pulse",
    "name": "Pulse",
    "title": "The next idea starts moving.",
    "pitch": "A demonstration startup site introduces a product vision and transparent milestones.",
    "offers": [
      "Product vision",
      "Development roadmap",
      "Community feedback"
    ],
    "projects": [
      "A prototype note",
      "The first iteration",
      "A launch checklist"
    ],
    "story": "Milestones are fictional and do not imply investment, traction or shipped features.",
    "colors": {
      "background": "#FCF3ED",
      "foreground": "#342B53",
      "accent": "#F06A4F"
    }
  },
  {
    "category": 5,
    "id": "vault",
    "name": "Vault",
    "title": "Trust starts with clear boundaries.",
    "pitch": "A fictional fintech company explains product safeguards and responsible financial communication.",
    "offers": [
      "Safety principles",
      "Product explanation",
      "Contact and support"
    ],
    "projects": [
      "A security review",
      "A clear consent flow",
      "A service boundary"
    ],
    "story": "This is not a regulated financial provider, account-opening or transaction service.",
    "colors": {
      "background": "#111F2D",
      "foreground": "#F2F5F4",
      "accent": "#5AAE9B"
    }
  },
  {
    "category": 5,
    "id": "signal",
    "name": "Signal",
    "title": "Technology that communicates.",
    "pitch": "An illustrative digital agency shows how discovery, engineering and delivery fit together.",
    "offers": [
      "Discovery sessions",
      "Technical delivery",
      "Service operations"
    ],
    "projects": [
      "An integration map",
      "An audit sprint",
      "A handover guide"
    ],
    "story": "Case studies are fictional and do not claim actual client performance.",
    "colors": {
      "background": "#EAF0F5",
      "foreground": "#223C52",
      "accent": "#DD7951"
    }
  },
  {
    "category": 6,
    "id": "impact",
    "name": "Impact",
    "title": "People before statistics.",
    "pitch": "A fictional nonprofit uses stories to explain programmes, volunteering and accountability.",
    "offers": [
      "Community programmes",
      "Volunteer pathway",
      "Public accountability"
    ],
    "projects": [
      "A local workshop",
      "Shared learning",
      "Neighbourhood care"
    ],
    "story": "Every story is illustrative; no donation processing or reported impact totals exist.",
    "colors": {
      "background": "#F5F0E6",
      "foreground": "#29493B",
      "accent": "#BE8753"
    }
  },
  {
    "category": 6,
    "id": "together",
    "name": "Together",
    "title": "A place to belong and contribute.",
    "pitch": "An illustrative community group presents chapters, shared projects and events.",
    "offers": [
      "Local chapters",
      "Community projects",
      "Ways to participate"
    ],
    "projects": [
      "A chapter meeting",
      "Community garden",
      "Shared skills"
    ],
    "story": "Groups and events are fictional; there is no live membership or event registration.",
    "colors": {
      "background": "#E8F0EB",
      "foreground": "#274E58",
      "accent": "#F3A76D"
    }
  },
  {
    "category": 6,
    "id": "journal",
    "name": "Journal",
    "title": "Stories deserve room to breathe.",
    "pitch": "A fictional independent publication gives articles, topics and contributors thoughtful structure.",
    "offers": [
      "Features",
      "Topic collections",
      "Contributor notes"
    ],
    "projects": [
      "A long read",
      "A visual essay",
      "From the editor"
    ],
    "story": "All published stories and authors are demonstration content, not factual reporting.",
    "colors": {
      "background": "#F7F4EB",
      "foreground": "#25272D",
      "accent": "#9B826A"
    }
  },
  {
    "category": 6,
    "id": "voice",
    "name": "Voice",
    "title": "Ideas made to be shared.",
    "pitch": "An illustrative public speaker website organises writing, talks and clear enquiries.",
    "offers": [
      "Speaking topics",
      "Essays",
      "Media enquiries"
    ],
    "projects": [
      "A keynote outline",
      "The interview",
      "An open question"
    ],
    "story": "Appearances and media stories are fictional and not verified endorsements.",
    "colors": {
      "background": "#F5EDE6",
      "foreground": "#4B304C",
      "accent": "#C07C62"
    }
  },
  {
    "category": 6,
    "id": "heritage",
    "name": "Heritage",
    "title": "Memory has a living future.",
    "pitch": "A fictional cultural archive connects collections, exhibitions and community memory.",
    "offers": [
      "Collection stories",
      "Exhibition concepts",
      "Community initiatives"
    ],
    "projects": [
      "The family archive",
      "An oral history",
      "Objects in context"
    ],
    "story": "All exhibits and archive material are invented examples, not authenticated heritage records.",
    "colors": {
      "background": "#F1EBDD",
      "foreground": "#493E35",
      "accent": "#9C7754"
    }
  },
  {
    "category": 6,
    "id": "collective",
    "name": "Collective",
    "title": "Membership built on shared purpose.",
    "pitch": "A demonstration professional association explains chapters, benefits and enquiries.",
    "offers": [
      "Chapter network",
      "Member resources",
      "Participation pathway"
    ],
    "projects": [
      "The annual gathering",
      "A local chapter",
      "The shared handbook"
    ],
    "story": "No live memberships, credentials or paid benefits are activated by this sample.",
    "colors": {
      "background": "#EFF3F1",
      "foreground": "#244A4A",
      "accent": "#66A393"
    }
  },
  {
    "category": 7,
    "id": "estate",
    "name": "Estate",
    "title": "Places worth imagining.",
    "pitch": "An illustrative property practice presents sample listings, area guides and viewing enquiries.",
    "offers": [
      "Property showcases",
      "Neighbourhood guides",
      "Viewing requests"
    ],
    "projects": [
      "Courtyard residence",
      "City apartment",
      "Garden home"
    ],
    "story": "Listings are fictional and do not represent property availability or verified addresses.",
    "colors": {
      "background": "#ECEAE3",
      "foreground": "#2C3B3E",
      "accent": "#A88A63"
    }
  },
  {
    "category": 7,
    "id": "care",
    "name": "Care",
    "title": "Care begins with listening.",
    "pitch": "A fictional healthcare practice introduces services, practitioners and appointment enquiries.",
    "offers": [
      "Service information",
      "Practitioner profiles",
      "Appointment guidance"
    ],
    "projects": [
      "A welcoming reception",
      "Consultation approach",
      "Patient information"
    ],
    "story": "This is not a real medical practice, emergency contact or confirmed appointment system.",
    "colors": {
      "background": "#EDF4F2",
      "foreground": "#294F59",
      "accent": "#84AFA8"
    }
  },
  {
    "category": 7,
    "id": "build",
    "name": "Build",
    "title": "Precision from start to finish.",
    "pitch": "A demonstration construction company explains projects, methods and safe delivery.",
    "offers": [
      "Project planning",
      "Construction process",
      "Quality checks"
    ],
    "projects": [
      "A renovation sequence",
      "Site preparation",
      "Material testing"
    ],
    "story": "Example projects are not real completed works, certifications or performance claims.",
    "colors": {
      "background": "#F1EFEA",
      "foreground": "#303C45",
      "accent": "#CC8B52"
    }
  },
  {
    "category": 7,
    "id": "motion",
    "name": "Motion",
    "title": "Every journey deserves good service.",
    "pitch": "A fictional automotive workshop outlines servicing, diagnostics and booking enquiries.",
    "offers": [
      "Vehicle servicing",
      "Diagnostic checks",
      "Workshop guidance"
    ],
    "projects": [
      "A service bay",
      "Maintenance planning",
      "The handover"
    ],
    "story": "Service examples do not guarantee availability, repairs or manufacturer certification.",
    "colors": {
      "background": "#17252D",
      "foreground": "#F3F5F4",
      "accent": "#E6A44A"
    }
  },
  {
    "category": 7,
    "id": "local",
    "name": "Local",
    "title": "A familiar name around the corner.",
    "pitch": "An illustrative neighbourhood-services business shares service coverage and simple contact details.",
    "offers": [
      "Household services",
      "Service areas",
      "Opening information"
    ],
    "projects": [
      "A local visit",
      "A community project",
      "Behind the counter"
    ],
    "story": "Opening hours, addresses and reviews must be verified before customer use.",
    "colors": {
      "background": "#F6F2E7",
      "foreground": "#395242",
      "accent": "#C58D59"
    }
  },
  {
    "category": 7,
    "id": "greenfield",
    "name": "Greenfield",
    "title": "Growing with care for tomorrow.",
    "pitch": "A fictional agricultural venture explains its farm story, products and environmental commitments.",
    "offers": [
      "Farm practices",
      "Seasonal produce",
      "Producer partnerships"
    ],
    "projects": [
      "Soil and seed",
      "Harvest planning",
      "A shared market"
    ],
    "story": "Claims about yields, sustainability and provenance are fictional pending evidence.",
    "colors": {
      "background": "#F0F1DF",
      "foreground": "#304A32",
      "accent": "#99AB57"
    }
  }
] as const;
