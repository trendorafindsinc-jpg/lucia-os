# Phase 12 — Premium Layout design architecture

**Acceptance: PASS — architecture/design scope.** Executed inventory, canonical consistency and browser evidence are recorded below and in the Phase 11 report. This is not a claim that the 48 websites are implemented.

## Authority and phase boundary

Baseline main `8ad0dc9a50af2a073025b712ffd7ce72ed7c48f7` includes the reconciled [48-Layout catalogue](layouts-48-premium-catalogue.md), [storage/Paystack contract](layouts-s3-storage-contract.md) and roadmap. Those documents remain authoritative. This report elaborates their exact names and art directions; it does not introduce another catalogue. Built-in Layouts and standard creation/editing/publishing are free. Custom-domain access is optional ₦5,000 one-time through Store, separate from registrar fees; Paystack is approved. No checkout, S3 configuration or eight-Layout implementation is introduced here.

Phase 11 stabilizes existing website data paths. Phase 12 provides inventory, design briefs and acceptance rules. Phase 13 implements registered composition primitives; Phase 14 produces reviewed flagship websites. Release gates remain **8 → 16 → 32 → 48**, with one flagship per category before expansion. Legacy internal `templates` paths remain compatibility details; customer-facing terminology is Layouts.

## Executed inventory of current designs

`catalogue-inventory.test.tsx` instantiates **every one of the 37 current records**, validates its real SiteDraft, converts it through the existing `siteDraftToLayoutBlueprint` adapter and renders `LayoutRenderer` to actual HTML. This is not an inventory inferred from catalogue thumbnails.

Actual renderer families: editorial 16, split 1, classic 1, cards 7, gallery 7, storefront 5. **All 37 generate one home page with the same hero → content-grid → contact section sequence.** Different CSS families do not establish 37 commissioned designs. Catalogue cards use six abstract CSS compositions, with several card/actual-renderer mismatches. Internal published paths currently reuse the same homepage snapshot with a changed title; they are not 37 independent complete multi-page websites.

No usable built-in photographic/image asset collection was found: the repository's raster files are acceptance screenshots, not licensed Layout imagery. Brand/app icons are code-native SVG; preview artwork is CSS. Do not repurpose acceptance screenshots as customer imagery. Existing media-library functionality stores validated URL/key references and metadata in PostgreSQL, with explicit “no file uploaded” messages. It is not durable upload storage, and the current SiteDraft public adapter does not render that media library as a finished catalogue website. Preserve existing references; use licensed repository assets for the future flagship designs and the approved provider-neutral adapter when customer uploads become necessary.

### Current records (preserve IDs and customer associations)

| Existing ID | Display name | Existing category | Abstract card | Actual CSS family |
| --- | --- | --- | --- | --- |
| `northstar-consulting` | Northstar Consulting | Business | editorial | editorial |
| `atlas-studio` | Atlas Studio | Business | gallery | split |
| `fieldwork-professional` | Fieldwork Professional | Business | editorial | editorial |
| `summit-financial` | Summit Financial | Business | editorial | editorial |
| `civic-legal` | Civic Legal | Business | editorial | classic |
| `harbor-property` | Harbor Property | Business | editorial | editorial |
| `brightpath-coaching` | Brightpath Coaching | Business | editorial | editorial |
| `meridian-nonprofit` | Meridian Impact | Community | service | cards |
| `neighborhood-hub` | Neighbourhood Hub | Community | service | cards |
| `cultural-house` | Cultural House | Community | service | cards |
| `schoolhouse` | Schoolhouse | Education | service | cards |
| `academy-modern` | Academy Modern | Education | split | cards |
| `little-steps` | Little Steps | Education | service | cards |
| `knowledge-library` | Knowledge Library | Education | service | cards |
| `folio-atelier` | Folio Atelier | Portfolio | gallery | gallery |
| `portrait-practice` | Portrait Practice | Portfolio | gallery | gallery |
| `architect-lines` | Architect Lines | Portfolio | gallery | gallery |
| `maker-journal` | Maker Journal | Creative | gallery | gallery |
| `independent-musician` | Independent Artist | Creative | gallery | gallery |
| `paper-and-ink` | Paper & Ink | Creative | gallery | gallery |
| `market-goods` | Market Goods | Storefront | storefront | storefront |
| `form-and-function` | Form & Function | Storefront | storefront | storefront |
| `everyday-wear` | Everyday Wear | Storefront | storefront | storefront |
| `harvest-table` | Harvest Table | Storefront | storefront | storefront |
| `artisan-market` | Artisan Market | Storefront | storefront | storefront |
| `stay-slow` | Stay Slow | Hospitality | hospitality | editorial |
| `table-and-tide` | Table & Tide | Hospitality | hospitality | editorial |
| `roam-guide` | Roam Guide | Hospitality | hospitality | editorial |
| `event-house` | Event House | Hospitality | hospitality | editorial |
| `wellbeing-studio` | Wellbeing Studio | Wellness | gallery | editorial |
| `movement-club` | Movement Club | Wellness | service | editorial |
| `skin-and-soul` | Skin & Soul | Wellness | service | editorial |
| `care-collective` | Care Collective | Wellness | service | editorial |
| `garden-and-ground` | Garden & Ground | Business | editorial | editorial |
| `buildcraft` | Buildcraft | Business | split | editorial |
| `tech-launch` | Tech Launch | Business | split | editorial |
| `newsroom` | The Newsroom | Creative | gallery | gallery |

**Inventory disposition:** retain all existing saved IDs and their working legacy renderer. None is automatically renamed to a canonical premium Layout or counted as complete in the approved 48. The catalogue copy now calls them starters, explains the limited preview claim and links to the actual working Studio preview. The legacy card art is illustrative, not a promise of a pixel-identical premium website.

## Shared composition contract for Phase 13

Extend the existing `src/lib/layout-blueprint/blueprint.ts` and `LayoutRenderer`; do not create another website engine. The existing `lucia.loom-blueprint` v1 schema ID and compatibility exports are persisted contracts. A new schema version must be explicit, keep v1 readable and never reinterpret existing SiteDraft JSON as a new design automatically.

| Concept | Required contract | Existing integration point |
| --- | --- | --- |
| Layout Definition | Stable repository ID and immutable version; canonical category; design identity; page recipes; token references; responsive transformations; registered sections/variants; licensed asset refs; supported editing capabilities | Version-controlled definitions consumed by the existing adapter/renderer; no second live app registry or DB service |
| Page Definition | Stable page ID, normalized unique route, title/SEO/navigation metadata, ordered section-instance IDs and page-specific content | Existing Blueprint `pages`, website page records and website structure contract; renderer must select the requested page rather than always home |
| Section Definition | Registered code-owned type and variants; discriminated content schema; bounded configurable properties; responsive rules; accessibility behavior | Existing registered section union (`hero`, `content-grid`, `call-to-action`, `contact`) extended with real tested components |
| Section Instance | Stable project-owned instance ID, registered type/variant/version, validated content, bounded style-token refs and permitted order zone | Ordered page sections; never executable strings or arbitrary JSX/HTML |
| Customer Project | Verified account/organization owner; selected Layout ID/version; customer-owned content/asset refs; customization overlay; immutable publication and current draft; concurrency token | Existing `websites`, `website_pages`, `website_structures`, version snapshots and publishing transaction |

### Versioning, persistence and migration

- The proposed IDs below reserve design identities for future implementation; they are **not** registered as available designs in current runtime code. Store `layoutId` and immutable `layoutVersion` separately. Never map an old design solely because its name sounds similar.
- Persist customer content separately from repository defaults. An upstream Layout update cannot overwrite edited customer content. Copy-on-create materializes a valid project; defaults are references or explicitly versioned values, never mutable shared customer state.
- Keep one authoritative draft/publication boundary. A composition save must atomically update the relevant page/structure records and expand the Phase 11 revision token to cover all mutable project inputs. The present token covers the durable SiteDraft home content, not future independent structure/media/SEO edits.
- Publishing must validate the entire supported composition and commit immutable public snapshots and metadata together. Rendering uses the same registered components for preview, editor and public paths; previews must not invent capabilities unavailable in publication.
- Phase 13 first evaluates whether existing website-structure metadata can carry the required versioned composition. Only add a schema migration if a demonstrated persistence requirement cannot fit the existing model. No composition schema migration is included in Phase 12.
- Unsupported versions fail safely with recovery/export options; never silently drop unknown sections. Any v1-to-v2 migration requires explicit compatibility tests, preserved originals and a rollback/forward-recovery plan.

### Safety and bounds

Use discriminated schemas and a closed component/variant registry. No `eval`, executable expressions, arbitrary HTML, scripts, customer CSS, stylesheet URLs or unrestricted iframe/embed URLs. Text remains text. Token values resolve from approved bounded sets (type scale, spacing, colour and radius), not free-form style objects. Reject prototype keys, unknown executable properties, excessive depth, duplicate instance IDs and invalid paths. The current bounds (30 pages, 24 sections/page) are ceilings to review against performance evidence, not promises of unlimited complexity.

Asset references resolve through licensed repository manifests or authorized durable media records, never credentials or client-owned claims of ownership. Public snapshots contain only publishable references. No ephemeral filesystem upload is presented as permanent. Tenant identity is always server-validated; Layout IDs, URLs, browser snapshots and payment redirects never grant permissions. Paid domain access cannot substitute for ownership and DNS/TLS checks.

## Guided, Advanced and Design Lock

**Guided is the default future experience:** edit content/brand details/contact, select supported images/logos, choose pre-reviewed variants and reorder compatible content zones. Typography hierarchy, minimum sizes, spacing rhythm, colour contrast, grid relationships and responsive behavior stay within the Layout's registered constraints. Only show controls backed by working components. No future mode switch is added to today's editor by this report.

**Advanced:** expose additional registered page recipes, section variants and token choices, with validation and an accurate preview. It is not an arbitrary code editor. Unsupported variants are rejected; capabilities must be declared and tested before controls appear. Switching modes changes editing affordances, not ownership, entitlements or persisted content.

**Design Lock:** store a reversible design overlay and the repository baseline version. Lock protects type relationships, grid/crop constraints, spacing and essential disclosures while leaving customer content editable. “Restore design” resets only design overlay fields after a preview/diff and confirmation; it must not remove text, logos, image references, page data or custom contact details. Undo/recovery remains available. Content reset is a separate explicit action. Layout upgrades cannot silently unlock or delete a customer's overlay.

Each blueprint below names editable fields, supported variation candidates and lock restrictions. All variants are **implementation requirements**, not currently functioning controls. Navigation/footer/disclosures are structural zones; they cannot be dragged into arbitrary body positions. Chronological/dependent content preserves its semantic order even when a display variant changes.

## Individual blueprints — exact approved 48

All IDs are proposed repository design IDs; initial definition version will be 1. Category, canonical art direction and signature composition below are taken from the approved catalogue. All use optimized, licensed assets with explicit alt-text/focal-point fields. Animation defaults to none; any optional reveal is short, nonessential and disabled under reduced motion. Branding uses approved token sets with contrast validation, never arbitrary CSS. Persistent customer-image replacement waits for supported durable storage. Footer/nav contact/legal content remains editable within the stated structural constraints.

## Business & Professional Services

### Meridian

- **Identity:** `lucia.layout.meridian`, version 1 proposed; Business & Professional Services. Canonical direction: **Executive navy**. Signature: Offset hero; trust strip; service journeys; case-study rail.
- **Visual language and audience:** Executive advisory firms; measured authority. High-contrast serif display with humanist sans body, midnight/ivory with brass as a rule-line accent; offset 5/7 grid, generous gutters, square case photography, no floating glass panels.
- **Pages and composition:** Home: compact wordmark navigation → off-axis editorial headline beside boardroom portrait → credential strip → service journey chapters → horizontal case-study rail → consultation CTA. Pages: /services, /work, /about, /contact; footer carries office/legal/contact columns.
- **Responsive transformations:** Phone stacks headline, portrait and credential list; case rail becomes ordered cards. Tablet keeps a 4/8 split; desktop uses asymmetry and capped prose measure.
- **Customization and Design Lock:** Edit services, case outcomes with evidence, people, contact and brand mark. Swap portrait-led/text-led hero and reorder service/case chapters; lock headline scale, baseline rhythm and text/image balance.

### Keystone

- **Identity:** `lucia.layout.keystone`, version 1 proposed; Business & Professional Services. Canonical direction: **Architectural monochrome**. Signature: Full-bleed photography; asymmetric masonry; studio journal.
- **Visual language and audience:** Architecture studios; architectural monochrome. Condensed grotesk labels and restrained serif captions; graphite, warm white and concrete; 12-column irregular masonry, hard image edges and expansive photographic intervals.
- **Pages and composition:** Home: thin project-index navigation → full-bleed built-work image with inset title → staggered project masonry → studio position → journal. Pages: /projects, /projects/project-slug, /studio, /journal, /contact; footer lists address, collaborators and image credits.
- **Responsive transformations:** Phone preserves project order in a single column with captions below images; tablet uses two unequal columns; desktop permits staggered three-column masonry without hidden text.
- **Customization and Design Lock:** Edit projects, captions, credits and studio text; choose wide/portrait project tiles and reorder projects. Lock masonry ratios and caption alignment; brand colour remains a small accent, not an image overlay.

### Verity

- **Identity:** `lucia.layout.verity`, version 1 proposed; Business & Professional Services. Canonical direction: **Warm legal editorial**. Signature: Practice directory; attorney dossiers; consultation path.
- **Visual language and audience:** Legal practices; warm legal editorial. Literate serif headings, clear sans annotations, ink/cream/oxblood, tight reading columns with a wide margin for facts, softly ruled dossiers rather than decorative cards.
- **Pages and composition:** Home: practice-led navigation → statement plus restrained office image → practice directory → attorney dossiers → process and jurisdiction notes → consultation enquiry. Pages: /practices, /people, /insights, /contact; footer includes jurisdiction and regulatory disclosures.
- **Responsive transformations:** Phone turns directory columns into readable accordions only when implemented; otherwise ordered lists. Tablet pairs attorney portrait with biography; desktop uses a persistent factual side column.
- **Customization and Design Lock:** Edit practice scope, attorney credentials and evidence-backed biographies. Reorder practice entries; select portrait/text dossiers. Lock legal disclosure visibility, minimum body size and reading width; never manufacture case results.

### Summit

- **Identity:** `lucia.layout.summit`, version 1 proposed; Business & Professional Services. Canonical direction: **Bold consulting**. Signature: Angular hero; outcome metrics; process timeline.
- **Visual language and audience:** Strategy consultancies; bold consulting. Large geometric sans, deep ink/chalk with one vermilion signal, diagonal crop masks confined to images, broad numbered chapters and ample breathing room around evidence.
- **Pages and composition:** Home: direct navigation → angular proposition hero → verified outcome ledger → capability lanes → process timeline → selected engagements → project enquiry. Pages: /capabilities, /engagements, /approach, /contact; footer has office links and disclosure notes.
- **Responsive transformations:** Phone removes angled text clipping and shows outcomes vertically; tablet timeline wraps into two rows; desktop keeps an expansive horizontal process without horizontal page scrolling.
- **Customization and Design Lock:** Edit capabilities, engagement narratives and cited metrics. Swap timeline/list process and reorder proof chapters. Lock diagonal geometry, metric labels and contrast; motions limited to optional short opacity reveals.

### Foundry

- **Identity:** `lucia.layout.foundry`, version 1 proposed; Business & Professional Services. Canonical direction: **Industrial utility**. Signature: Machinery hero; capabilities matrix; geographic coverage.
- **Visual language and audience:** Industrial manufacturers; industrial utility. Compact technical sans with monospaced specifications, steel/navy/safety amber, square tables, dense but legible capability matrices and documentary machinery photography.
- **Pages and composition:** Home: utility/contact bar → machinery hero → product/capability matrix → production standards → geographic coverage → technical enquiry. Pages: /capabilities, /industries, /quality, /contact; footer includes certifications with sources and facility addresses.
- **Responsive transformations:** Phone converts matrices to labelled attribute groups; tablet retains two-column capability sets; desktop exposes comparison tables with contained scrolling and repeated row labels.
- **Customization and Design Lock:** Edit specifications, facilities, standards and downloadable document references. Select matrix/attribute-list variants and reorder industry groups. Lock unit labels, table semantics and certification evidence; no animated machinery backgrounds.

### Civic

- **Identity:** `lucia.layout.civic`, version 1 proposed; Business & Professional Services. Canonical direction: **Public-service clarity**. Signature: Task-based services; accessible guides; noticeboard.
- **Visual language and audience:** Public-service organisations; public-service clarity. Highly legible sans, civic navy/white with teal task accents, consistent square task tiles, strong focus treatments and modest documentary imagery.
- **Pages and composition:** Home: search/task navigation → most-used services → eligibility guides → notices → contact/accessibility support. Pages: /services, /guides, /notices, /contact; footer carries accessibility, privacy, service hours and responsible authority.
- **Responsive transformations:** Phone prioritizes task list and contact; tablet uses a two-column services/noticeboard split; desktop adds a stable guide sidebar without concealing the main task.
- **Customization and Design Lock:** Edit service descriptions, eligibility, deadlines and contacts. Reorder task priorities and choose list/tile service views. Lock heading hierarchy, keyboard order and notice dates; search must be backed by real filtering or omitted.

## Portfolio & Creative

### Canvas

- **Identity:** `lucia.layout.canvas`, version 1 proposed; Portfolio & Creative. Canonical direction: **Quiet white gallery**. Signature: Art-first index; project essays.
- **Visual language and audience:** Artists and visual designers; quiet white gallery. Discreet sans labels, off-white/charcoal, generous image gutters, large unframed art and sparse typography whose scale follows the work rather than a marketing hero.
- **Pages and composition:** Home: tiny name/menu → art-first project index → selected project essay teasers → biography/contact. Pages: /work, /work/project-slug, /about, /contact; footer is a restrained credits/contact line.
- **Responsive transformations:** Phone uses a single flowing image sequence with always-visible captions; tablet alternates wide and paired works; desktop supports deliberate image-led 3-column index spacing.
- **Customization and Design Lock:** Edit work, mediums, dimensions, captions and essays. Choose image-index/essay-index and reorder works. Lock aspect-ratio intent, caption proximity and image credits; reveal animation is optional and never delays access.

### Prism

- **Identity:** `lucia.layout.prism`, version 1 proposed; Portfolio & Creative. Canonical direction: **Experimental typography**. Signature: Oversized type; staggered projects; poster compositions.
- **Visual language and audience:** Experimental graphic studios; experimental typography. Oversized variable-looking display type from a licensed registered font, acid accent/black/paper, poster-like asymmetrical modules and abrupt but controlled scale changes.
- **Pages and composition:** Home: typographic menu → poster statement with layered static artwork → staggered project posters → process fragments → contact. Pages: /projects, /projects/project-slug, /manifesto, /contact; footer is a typographic signature with readable legal links.
- **Responsive transformations:** Phone replaces overlapping text with stacked poster compositions; tablet uses a two-track stagger; desktop may use controlled overlap only outside text reading regions.
- **Customization and Design Lock:** Edit headlines, artwork and project labels. Choose typographic/poster hero and reorder projects; lock type ratios, overlap exclusion zones and motion limits. No marquee is required to read content.

### Atelier

- **Identity:** `lucia.layout.atelier`, version 1 proposed; Portfolio & Creative. Canonical direction: **Warm editorial**. Signature: Longform narratives; process imagery.
- **Visual language and audience:** Craft-led design practices; warm editorial. Expressive book serif, understated sans captions, linen/umber/cream, book-spread grids, tactile process photographs and soft but sparse framing.
- **Pages and composition:** Home: editorial masthead → studio introduction beside detail image → longform project story → process sequence → commissions invitation. Pages: /stories, /stories/project-slug, /studio, /commissions; footer includes studio hours and material credits.
- **Responsive transformations:** Phone linearizes each spread into image/caption/text order; tablet uses paired process images; desktop allows alternating longform spreads with bounded text width.
- **Customization and Design Lock:** Edit project narratives, process imagery, materials and commission details. Swap essay/photo-spread sections; reorder stories. Lock caption typography and vertical narrative rhythm, retaining customer copy when restoring style.

### Monograph

- **Identity:** `lucia.layout.monograph`, version 1 proposed; Portfolio & Creative. Canonical direction: **Literary monochrome**. Signature: Typographic directory; case study chapters.
- **Visual language and audience:** Independent researchers and designers; literary monochrome. Bookish serif body and tiny sans metadata, black/ivory, narrow essay measure, fine rules and a structured text-first directory.
- **Pages and composition:** Home: publication-like masthead → indexed projects → featured case-study chapter → selected writings → correspondence. Pages: /index, /case-studies/project-slug, /writing, /about; footer resembles a colophon with credits and contact.
- **Responsive transformations:** Phone preserves numbered order and moves marginalia inline; tablet allows one margin column; desktop uses asymmetrical chapter layouts without widening paragraphs beyond reading comfort.
- **Customization and Design Lock:** Edit essays, dates, project metadata and credits. Choose numbered/table-of-contents index; reorder publications. Lock line length, footnote relationships and heading rhythm; no compulsory entrance animation.

### Frame

- **Identity:** `lucia.layout.frame`, version 1 proposed; Portfolio & Creative. Canonical direction: **Cinematic photography**. Signature: Immersive visual sequences; collection galleries.
- **Visual language and audience:** Photographers and filmmakers; cinematic photography. Neutral grotesk labels, near-black/soft white, edge-to-edge licensed imagery, deliberate letterboxing and minimal overlays with solid scrims where needed.
- **Pages and composition:** Home: immersive still-image sequence → collection selector → editorial gallery → photographer statement → commission contact. Pages: /collections, /collections/series-slug, /about, /contact; footer lists image rights and production credits.
- **Responsive transformations:** Phone uses portrait-safe crops with visible next/previous controls; tablet pairs images by narrative; desktop presents immersive wide sequences. Video is an optional supported asset, never autoplay dependency.
- **Customization and Design Lock:** Edit collections, captions, image focal points and credits. Choose sequential/grid collections; reorder images. Lock scrim contrast and image-navigation semantics; reduced motion removes transitions entirely.

### Muse

- **Identity:** `lucia.layout.muse`, version 1 proposed; Portfolio & Creative. Canonical direction: **Illustrative artistic**. Signature: Organic sections; illustrated biography.
- **Visual language and audience:** Illustrators; illustrative artistic. Friendly serif headlines with rounded sans body, ink/pastel paper, organic illustration frames, open compositions and a warm illustrated biography.
- **Pages and composition:** Home: illustrated welcome → selected illustration stories → medium/process snippets → illustrated biography → commissions. Pages: /illustration, /projects/project-slug, /about, /contact; footer features a small original illustration plus rights/contact.
- **Responsive transformations:** Phone replaces organic overlaps with clean framed images; tablet pairs work and annotations; desktop uses an uneven gallery with generous visual pauses.
- **Customization and Design Lock:** Edit portfolio, commission types, illustration assets and biography. Choose framed/full-bleed work sections and reorder galleries. Lock text exclusion areas around artwork, alt-text requirements and approachable type scale.

## Hospitality & Lifestyle

### Savour

- **Identity:** `lucia.layout.savour`, version 1 proposed; Hospitality & Lifestyle. Canonical direction: **Dramatic restaurant**. Signature: Menu showcase; chef story; reservation enquiry.
- **Visual language and audience:** Destination restaurants; dramatic restaurant. Elegant high-contrast serif, compact menu sans, near-black/bone/copper, dramatic food photography and highly structured menu columns.
- **Pages and composition:** Home: compact hours/navigation → dish-led hero → seasonal menu → chef story → dining-room imagery → reservation enquiry. Pages: /menu, /story, /visit, /contact; footer keeps hours, allergens guidance and location visible.
- **Responsive transformations:** Phone puts hours and menu before large imagery; tablet pairs menu categories; desktop creates theatrical full-width food sections separated by quiet menu typography.
- **Customization and Design Lock:** Edit dishes, prices, dietary notes, hours and enquiry contact. Choose menu columns/list and reorder menu groups. Lock price associations and allergens; reservation is an enquiry unless a real booking service is connected.

### Haven

- **Identity:** `lucia.layout.haven`, version 1 proposed; Hospitality & Lifestyle. Canonical direction: **Refined boutique hotel**. Signature: Property tour; room comparison; booking enquiry.
- **Visual language and audience:** Boutique hotels; refined boutique hotel. Warm serif display and clear hospitality sans, limestone/forest/cream, panoramic property imagery, generous room comparison rows and restrained framed details.
- **Pages and composition:** Home: property navigation with visit CTA → panoramic stay hero → property tour → room comparison → amenities/local guide → booking enquiry. Pages: /rooms, /rooms/room-slug, /experiences, /location, /enquire; footer includes address and cancellation/contact information.
- **Responsive transformations:** Phone prioritizes room facts and enquiry, using stacked room comparisons; tablet uses room image/facts pairs; desktop uses long panoramic transitions into calm comparison rows.
- **Customization and Design Lock:** Edit room attributes, indicative pricing, amenities and location. Choose room rows/cards and reorder experiences. Lock factual room labels, CTA availability and no-false-availability language; no invented reservation inventory.

### Bloom

- **Identity:** `lucia.layout.bloom`, version 1 proposed; Hospitality & Lifestyle. Canonical direction: **Calm botanical wellness**. Signature: Service rituals; therapist introductions; appointment enquiry.
- **Visual language and audience:** Wellness studios; calm botanical wellness. Soft serif with readable sans, sage/chalk/clay, spacious single-service rituals, botanical stills and restrained rounded corners.
- **Pages and composition:** Home: calm navigation → botanical service invitation → ritual journeys → therapist introductions → preparation FAQ → appointment enquiry. Pages: /rituals, /practitioners, /visit, /contact; footer carries qualifications/disclaimers and access information.
- **Responsive transformations:** Phone stacks rituals with duration/price labels; tablet pairs therapist profiles; desktop leaves open margins around long service narratives rather than filling space with cards.
- **Customization and Design Lock:** Edit service duration, prices, practitioner biographies and contact. Choose ritual timeline/service-list variants and reorder rituals. Lock medical-claim disclaimers, readable contrast and gentle radius scale.

### Nomad

- **Identity:** `lucia.layout.nomad`, version 1 proposed; Hospitality & Lifestyle. Canonical direction: **Adventure journal**. Signature: Destinations; itinerary boards; travel enquiry.
- **Visual language and audience:** Travel planners; adventure journal. Rugged serif headlines and practical sans itinerary text, earth/sky/ink, map-like static diagrams, documentary destinations and numbered journey pages.
- **Pages and composition:** Home: destination navigation → landscape expedition story → itinerary boards → travel approach → practical FAQs → trip enquiry. Pages: /destinations, /journeys/journey-slug, /planning, /contact; footer contains operating region and safety disclosures.
- **Responsive transformations:** Phone linearizes itineraries day by day; tablet pairs maps and activities; desktop uses asymmetric editorial destination spreads. Maps require licensed assets or an approved integration, not a fake live map.
- **Customization and Design Lock:** Edit routes, dates, inclusions and travel images. Choose itinerary board/list and reorder destination stories. Lock chronological day numbering and disclosure blocks; no false booking or real-time availability controls.

### Gather

- **Identity:** `lucia.layout.gather`, version 1 proposed; Hospitality & Lifestyle. Canonical direction: **Elegant event styling**. Signature: Celebration stories; packages; enquiry.
- **Visual language and audience:** Event stylists; elegant event styling. Fashion-like serif, understated sans details, pearl/plum/ink, airy photo essays, varied image ratios and finely spaced event package tables.
- **Pages and composition:** Home: event-story navigation → celebration image hero → event story sequence → styling approach → package comparison → enquiry. Pages: /celebrations, /stories/event-slug, /services, /contact; footer keeps region, enquiry and credit links.
- **Responsive transformations:** Phone presents celebration essays in reading order; tablet groups detail pairs; desktop combines wide scenes with intimate details without duplicating a generic services grid.
- **Customization and Design Lock:** Edit event stories, service scope, package details and photographer credits. Choose gallery/story modules and reorder celebrations. Lock image rhythm and package-label alignment; enquiry remains honest rather than simulated scheduling.

### Bistro

- **Identity:** `lucia.layout.bistro`, version 1 proposed; Hospitality & Lifestyle. Canonical direction: **Neighborhood character**. Signature: Menu-first content; hours; location.
- **Visual language and audience:** Neighbourhood cafés; neighborhood character. Bold friendly serif with utilitarian sans, cream/tomato/espresso, compact signboard-like panels, modest street/food imagery and visible operating information.
- **Pages and composition:** Home: name/hours/location masthead → menu-first introduction → daily offerings → neighbourhood story → directions/contact. Pages: /menu, /our-place, /visit; footer repeats hours, dietary contact and street address.
- **Responsive transformations:** Phone shows today-style operating schedule as static owner-maintained hours, not live opening status; tablet pairs menu and location; desktop retains compact, useful density.
- **Customization and Design Lock:** Edit menu, prices, weekly hours and address. Choose chalkboard-like typography without image-only text and reorder menu categories. Lock hours readability and label/price pairings; omit delivery/ordering controls without a backend.

## Education & Learning

### Academia

- **Identity:** `lucia.layout.academia`, version 1 proposed; Education & Learning. Canonical direction: **Prestigious academic**. Signature: Programmes; departments; admissions; news.
- **Visual language and audience:** Universities and colleges; prestigious academic. Formal serif display with clear institutional sans, collegiate blue/cream/gold rules, broad programme directories and documentary campus photography.
- **Pages and composition:** Home: institutional utility/nav → academic proposition and campus image → programme finder → department highlights → admissions steps → news → visit/contact. Pages: /programmes, /departments, /admissions, /news, /contact; footer contains policies, accreditation evidence and official contacts.
- **Responsive transformations:** Phone prioritizes programme/admission tasks; tablet divides directory and admissions; desktop supports a restrained mega-navigation with keyboard alternatives and a clear news hierarchy.
- **Customization and Design Lock:** Edit programmes, eligibility, dates, staff and evidence-backed accreditation. Choose programme directory/list and reorder faculty highlights. Lock application deadlines, heading hierarchy and institutional navigation; applications link only to real intake.

### Sprout

- **Identity:** `lucia.layout.sprout`, version 1 proposed; Education & Learning. Canonical direction: **Playful early-learning**. Signature: Illustrated learning journey; parent FAQs.
- **Visual language and audience:** Early-learning centres; playful early-learning. Rounded but legible display sans, warm primary accents on cream, illustrated learning paths, soft geometry and cheerful small-group imagery with consent.
- **Pages and composition:** Home: parent-first navigation → illustrated learning welcome → learning journey → daily environment → parent FAQs → visit enquiry. Pages: /learning, /our-day, /parents, /visit; footer carries safeguarding and approved contact details.
- **Responsive transformations:** Phone presents a simple learning timeline; tablet combines illustrations and parent facts; desktop uses playful asymmetric zones while keeping body copy in regular columns.
- **Customization and Design Lock:** Edit age ranges, activities, hours and safeguarding text. Choose illustrated path/story panels and reorder learning stages only where chronological meaning remains clear. Lock contrast, minimum type sizes and child-image privacy rules.

### Scholar

- **Identity:** `lucia.layout.scholar`, version 1 proposed; Education & Learning. Canonical direction: **Modern school**. Signature: Curriculum; calendar; community stories.
- **Visual language and audience:** Primary and secondary schools; modern school. Confident sans with warm serif accents, school-colour primary plus neutral paper, tidy curriculum grids, student-life imagery and disciplined spacing.
- **Pages and composition:** Home: school/navigation → learning proposition → curriculum stages → calendar highlights → community stories → admissions enquiry. Pages: /curriculum, /school-life, /calendar, /admissions; footer exposes safeguarding, address and parent contacts.
- **Responsive transformations:** Phone surfaces admissions and calendar dates; tablet pairs curriculum stages; desktop balances a large school image with practical information rather than an empty hero.
- **Customization and Design Lock:** Edit curriculum, school dates, policies and approved photographs. Choose stage tabs only with functioning keyboard state, otherwise sections; reorder stories. Lock date formats, child privacy and information hierarchy.

### Mentor

- **Identity:** `lucia.layout.mentor`, version 1 proposed; Education & Learning. Canonical direction: **Personal educator**. Signature: Instructor story; learning programmes; contact intake.
- **Visual language and audience:** Independent tutors; personal educator. Warm serif personality and readable sans, cream/teal/ink, a portrait-and-introduction split, narrow learning programme narratives and approachable rounded details.
- **Pages and composition:** Home: personal nav → tutor portrait/approach → learning programmes → teaching method → evidence-backed student stories → contact intake. Pages: /programmes, /approach, /resources, /contact; footer includes qualifications and contact hours.
- **Responsive transformations:** Phone puts subjects and contact early; tablet pairs portrait and method; desktop presents editorial learning pathways, not institutional mega-navigation.
- **Customization and Design Lock:** Edit subjects, availability descriptions, fees and qualification evidence. Choose programme narrative/comparison and reorder subjects. Lock qualification disclosures and testimonial consent; no fabricated exam outcomes or scheduling.

### Elevate

- **Identity:** `lucia.layout.elevate`, version 1 proposed; Education & Learning. Canonical direction: **Skills academy**. Signature: Course pathways; outcomes; programme enquiries.
- **Visual language and audience:** Vocational academies; skills academy. Strong geometric sans and compact technical labels, ink/lime/white, pathway diagrams, practical course facts and workshop-focused imagery.
- **Pages and composition:** Home: skills navigation → outcome-led hero → course pathways → learning facilities → documented alumni outcomes → programme enquiry. Pages: /courses, /courses/course-slug, /facilities, /enquire; footer carries eligibility and provider credentials.
- **Responsive transformations:** Phone converts branching pathways into ordered steps; tablet uses paired course facts; desktop permits a visual pathway diagram with an equivalent text sequence.
- **Customization and Design Lock:** Edit course duration, prerequisites, equipment and evidence-backed outcomes. Choose pathway/list variants and reorder course families. Lock prerequisite relationships and outcome-source labels; payment and enrollment remain separate integrations.

### Campus

- **Identity:** `lucia.layout.campus`, version 1 proposed; Education & Learning. Canonical direction: **Community institution**. Signature: Clubs; facilities; events; parent resources.
- **Visual language and audience:** Community schools and institutions; community institution. Humanist sans, restrained academic serif, navy/coral/paper, activity-led photo mosaics, community notices and structured parent resources.
- **Pages and composition:** Home: community navigation → institution welcome → clubs and facilities → event directory → parent resources → contact. Pages: /community, /facilities, /events, /parents; footer includes safeguarding, transport/contact information where supplied.
- **Responsive transformations:** Phone prioritizes notices and parent links; tablet uses two-column activities/resources; desktop balances community mosaics with predictable event lists.
- **Customization and Design Lock:** Edit clubs, facilities, events and resource links. Choose events list/calendar display only with real date navigation and reorder club stories. Lock date semantics, official notices and parent-resource accessibility.

## Commerce & Product Showcases

### Maison

- **Identity:** `lucia.layout.maison`, version 1 proposed; Commerce & Product Showcases. Canonical direction: **Luxury fashion**. Signature: Editorial lookbook; collection campaigns; enquiry.
- **Visual language and audience:** Fashion labels; luxury fashion. Editorial serif with small uppercase sans labels, ivory/black and an occasional campaign accent, full-width lookbook spreads, deliberate crops and refined whitespace.
- **Pages and composition:** Home: discreet collection nav → campaign double spread → collection story → alternating lookbook sequences → garment detail → enquiry. Pages: /collections, /collections/collection-slug, /story, /enquire; footer includes care, sizing, credits and contact.
- **Responsive transformations:** Phone uses art-directed portrait crops and visible captions; tablet creates paired looks; desktop uses fashion-magazine spreads with quiet navigation, never product-card repetition as the whole identity.
- **Customization and Design Lock:** Edit collections, materials, sizing notes and campaign credits. Choose lookbook/detail sequences and reorder looks. Lock crop intent, caption scale and image licensing; prices/enquiries are honest, no fake cart or checkout.

### Origin

- **Identity:** `lucia.layout.origin`, version 1 proposed; Commerce & Product Showcases. Canonical direction: **Natural products**. Signature: Ingredient storytelling; sustainability; product cards.
- **Visual language and audience:** Natural-product brands; natural products. Earthy serif and clean ingredient labels, sand/leaf/ink, ingredient macro photography, rounded ingredient discs and spacious provenance storytelling.
- **Pages and composition:** Home: product-story nav → ingredient hero → sourcing story → product collection → sustainability evidence → stockist/enquiry contact. Pages: /products, /ingredients, /our-source, /contact; footer includes product cautions and evidence sources.
- **Responsive transformations:** Phone orders ingredient story before dense specification groups; tablet pairs ingredient and product; desktop uses wide provenance chapters between catalogue rows.
- **Customization and Design Lock:** Edit ingredients, origin claims, product facts and source citations. Choose ingredient wheel/text list and reorder stories. Lock claims/disclaimer placement and label contrast; no fabricated environmental certification.

### Object

- **Identity:** `lucia.layout.object`, version 1 proposed; Commerce & Product Showcases. Canonical direction: **Minimal product museum**. Signature: Specification panels; detail views; catalogue grid.
- **Visual language and audience:** Furniture and designed objects; minimal product museum. Precise sans with monospaced dimensions, gallery white/charcoal, isolated object photography, rigid specification grids and sharp spacing.
- **Pages and composition:** Home: object index navigation → single object hero → object catalogue → material details → design process → commission enquiry. Pages: /objects, /objects/object-slug, /materials, /contact; footer lists studio, shipping enquiry and image credits.
- **Responsive transformations:** Phone places dimensions directly beneath images; tablet pairs object and specifications; desktop supports an image/specification split with a compact sticky index that remains keyboard-accessible.
- **Customization and Design Lock:** Edit dimensions, materials, finishes and photos. Choose isolated-object/detail-pair sections and reorder objects. Lock units, specification relationships and scale indicators; inventory is descriptive unless real stock is integrated.

### Harvest

- **Identity:** `lucia.layout.harvest`, version 1 proposed; Commerce & Product Showcases. Canonical direction: **Fresh food character**. Signature: Producers; seasonality; enquiry.
- **Visual language and audience:** Food producers and growers; fresh food character. Friendly serif and practical sans, produce green/cream/tomato, seasonal colour panels, documentary grower images and useful product lists.
- **Pages and composition:** Home: producer navigation → seasonal produce hero → grower stories → produce catalogue → seasonality notes → wholesale enquiry. Pages: /produce, /growers, /seasons, /contact; footer contains food-handling guidance and sourcing contact.
- **Responsive transformations:** Phone prioritizes produce availability descriptions with update dates; tablet pairs grower and product; desktop uses season-led chapters with varied photographic crops.
- **Customization and Design Lock:** Edit produce, units, season notes and provenance. Choose crop grid/season list and reorder grower stories. Lock freshness/date disclosures and unit labels; no live stock or ordering claims without backend support.

### Lustre

- **Identity:** `lucia.layout.lustre`, version 1 proposed; Commerce & Product Showcases. Canonical direction: **Premium beauty**. Signature: Campaigns; routines; product education.
- **Visual language and audience:** Beauty brands; premium beauty. Elegant editorial serif and crisp cosmetic labels, porcelain/rose/ink, close-up texture imagery, narrow ritual columns and restrained reflective accents.
- **Pages and composition:** Home: product/ritual nav → texture-led campaign → routine sequence → product education → ingredient transparency → enquiry. Pages: /products, /rituals, /ingredients, /contact; footer exposes usage cautions and brand contact.
- **Responsive transformations:** Phone sequences routines step by step; tablet pairs texture and product explanations; desktop uses alternating campaign and educational spreads.
- **Customization and Design Lock:** Edit routines, instructions, ingredients and campaign assets. Choose step-sequence/product-detail and reorder products within a routine group. Lock caution text, claims evidence and accessible contrast; no simulated purchase controls.

### Craft

- **Identity:** `lucia.layout.craft`, version 1 proposed; Commerce & Product Showcases. Canonical direction: **Artisan handmade**. Signature: Makers; materials; commission enquiry.
- **Visual language and audience:** Artisan makers; artisan handmade. Tactile serif with small workshop sans labels, clay/linen/ink, process-closeup photography, irregular yet aligned workshop narratives and modest soft corners.
- **Pages and composition:** Home: maker nav → workshop introduction → making process → finished work → materials and care → commission enquiry. Pages: /work, /process, /materials, /commissions; footer includes maker location, lead-time disclosures and credits.
- **Responsive transformations:** Phone follows material-to-finished-work order; tablet combines process pairs; desktop presents generous workbench-like spreads with captions outside images.
- **Customization and Design Lock:** Edit materials, commissions, lead times and care. Choose process strip/longform story and reorder finished works. Lock chronological process relationships, material labels and realistic delivery language.

## Technology & Digital Products

### Nexus

- **Identity:** `lucia.layout.nexus`, version 1 proposed; Technology & Digital Products. Canonical direction: **Structured SaaS**. Signature: Product walkthrough; feature matrix; integrations overview.
- **Visual language and audience:** Software product teams; structured SaaS. Modern sans with precise monospaced interface labels, midnight/white/cyan, product screenshots, modular but varied walkthrough bands and crisp comparison tables.
- **Pages and composition:** Home: product nav → product-in-use split hero → role-based walkthrough → feature matrix → integration overview → verified evidence → demo/contact. Pages: /product, /solutions, /integrations, /contact; footer has documentation, privacy and support links.
- **Responsive transformations:** Phone converts comparison to labelled feature groups and stacks screenshots before explanations; tablet supports two-step walkthrough pairs; desktop uses a product canvas alongside concise narrative.
- **Customization and Design Lock:** Edit supported features, screenshots, integrations and contact links. Choose walkthrough tabs only when state and keyboard behavior exist, otherwise linear steps; reorder solution groups. Lock truthful feature availability and table semantics; no fake signup or billing.

### Orbit

- **Identity:** `lucia.layout.orbit`, version 1 proposed; Technology & Digital Products. Canonical direction: **Restrained sci-fi AI**. Signature: Technical canvas; use cases; capability panels.
- **Visual language and audience:** AI product teams; restrained sci-fi AI. Technical sans with restrained mono annotations, dark ink/soft cyan/paper, static capability canvases, clear diagrams and tiny luminous accents without continuous particle effects.
- **Pages and composition:** Home: capability nav → technical canvas hero → task use cases → capability panels → limitations and safeguards → access enquiry. Pages: /capabilities, /use-cases, /safety, /contact; footer lists model/provider disclosures where relevant.
- **Responsive transformations:** Phone turns the canvas into a static labelled diagram; tablet places use cases beside task facts; desktop allows a wide technical canvas with text alternatives.
- **Customization and Design Lock:** Edit capabilities, limitations, diagrams and provider disclosures. Choose labelled-canvas/list sections and reorder use cases. Lock capability-status labels and motion ceilings; do not simulate AI output or imply unsupported offline abilities.

### Vector

- **Identity:** `lucia.layout.vector`, version 1 proposed; Technology & Digital Products. Canonical direction: **Developer clarity**. Signature: Documentation navigation; architecture explanation.
- **Visual language and audience:** Developer tools; developer clarity. Highly legible sans and registered monospace, off-white/ink/indigo, documentation-style sidebars, static code examples and precise spacing over decorative imagery.
- **Pages and composition:** Home: documentation nav → concise tool proposition → install/reference overview → architecture explanation → integration examples → support. Pages: /docs, /architecture, /examples, /contact; footer includes version, licence and support policy.
- **Responsive transformations:** Phone uses an accessible collapsible contents menu with a normal list fallback; tablet has a compact rail; desktop retains readable code widths and contained horizontal code scrolling.
- **Customization and Design Lock:** Edit documentation, versions, architecture diagrams and static examples. Choose diagram/code-explanation variants and reorder reference categories. Lock syntax escaping, licence/version notices and code readability; examples never execute customer scripts.

### Pulse

- **Identity:** `lucia.layout.pulse`, version 1 proposed; Technology & Digital Products. Canonical direction: **Startup energy**. Signature: Bold hero; traction; milestones.
- **Visual language and audience:** Early-stage technology companies; startup energy. Bold sans, ink/electric coral/cream, decisive colour fields, milestone timelines, team documentary imagery and compact proof blocks.
- **Pages and composition:** Home: company/product nav → focused startup proposition → evidenced traction → product story → milestones → team → enquiry. Pages: /product, /company, /updates, /contact; footer carries company identity and contact.
- **Responsive transformations:** Phone moves product proof before secondary brand imagery; tablet pairs milestones; desktop uses wide product statements broken by factual timelines.
- **Customization and Design Lock:** Edit milestones, product details, team and cited traction. Choose timeline/dated-list variants and reorder company stories. Lock evidence labels and dates; no invented investor logos, customer counts or waitlist success.

### Vault

- **Identity:** `lucia.layout.vault`, version 1 proposed; Technology & Digital Products. Canonical direction: **Trust-first fintech**. Signature: Security narrative; safeguards; financial product info.
- **Visual language and audience:** Financial product organisations; trust-first fintech. Sober sans and restrained serif statements, navy/white/muted gold, rigorous safeguard tables, clear disclosure bands and authentic institution imagery.
- **Pages and composition:** Home: product/security nav → trust proposition → product facts → safeguards → eligibility/fees disclosures → support contact. Pages: /products, /security, /disclosures, /support; footer retains legal identity and regulatory evidence.
- **Responsive transformations:** Phone puts risk/eligibility and support within the main reading flow; tablet pairs safeguards with explanations; desktop uses measured disclosure columns without tiny text.
- **Customization and Design Lock:** Edit actual product facts, fees, risk notices and verified regulatory credentials. Choose safeguard table/list and reorder product overviews. Lock risk visibility, fee labels and evidence sources; no fake balances, financial calculator outcomes or payment actions.

### Signal

- **Identity:** `lucia.layout.signal`, version 1 proposed; Technology & Digital Products. Canonical direction: **Technical agency**. Signature: Capabilities; workflows; case studies.
- **Visual language and audience:** Technical agencies; technical agency. Neutral grotesk and concise mono labels, graphite/lime/paper, workflow diagrams, technical case narratives and tightly organized capability bands.
- **Pages and composition:** Home: capability nav → agency proposition beside system diagram → workflows → technical case studies → delivery approach → enquiry. Pages: /services, /work, /approach, /contact; footer lists delivery regions, contact and legal identity.
- **Responsive transformations:** Phone replaces interconnected diagrams with numbered steps; tablet pairs case facts with narratives; desktop presents wide diagram-led chapters with clear text equivalents.
- **Customization and Design Lock:** Edit capabilities, delivery process, technical evidence and case details. Choose workflow diagram/list and reorder cases. Lock step dependencies and evidence provenance; no fabricated uptime or certification claims.

## Community, Nonprofit & Personal

### Impact

- **Identity:** `lucia.layout.impact`, version 1 proposed; Community, Nonprofit & Personal. Canonical direction: **Human-focused NGO**. Signature: Mission; programmes; impact evidence; volunteering.
- **Visual language and audience:** Nonprofits; human-focused NGO. Warm humanist sans, restrained serif emphasis, paper/forest/ochre, authentic people imagery, evidence-led programme chapters and generous readable spacing.
- **Pages and composition:** Home: mission/programme nav → human story hero → programme journeys → sourced impact evidence → volunteer opportunities → contact. Pages: /programmes, /impact, /volunteer, /about, /contact; footer includes charity identity, safeguarding and evidence links.
- **Responsive transformations:** Phone prioritizes mission and participation without crowding imagery; tablet pairs programme story/evidence; desktop uses a narrative-to-evidence rhythm rather than a generic donation hero.
- **Customization and Design Lock:** Edit programmes, cited outcomes, volunteer details and consented imagery. Choose impact ledger/story sections and reorder programmes. Lock source labels and safeguarding; donation/payment links appear only when real and authorized.

### Together

- **Identity:** `lucia.layout.together`, version 1 proposed; Community, Nonprofit & Personal. Canonical direction: **Inclusive community**. Signature: Chapters; community projects; event directory.
- **Visual language and audience:** Neighbourhood and regional groups; inclusive community. Friendly humanist sans, warm paper/blue/terracotta, community photographs, readable chapter directories and approachable rounded task modules.
- **Pages and composition:** Home: chapters/events nav → shared mission → local chapters → community projects → events directory → join enquiry. Pages: /chapters, /projects, /events, /contact; footer includes group governance and accessibility contacts.
- **Responsive transformations:** Phone promotes nearest chapter descriptions without geolocation assumptions; tablet pairs directory and events; desktop offers an accessible regional directory with static map alternatives.
- **Customization and Design Lock:** Edit chapters, projects, events and join instructions. Choose chapter directory/cards and reorder project highlights. Lock event dates and inclusive language; no fabricated member activity or enrollment success.

### Journal

- **Identity:** `lucia.layout.journal`, version 1 proposed; Community, Nonprofit & Personal. Canonical direction: **Independent publication**. Signature: Story-led homepage; topic collections; author archive.
- **Visual language and audience:** Independent publishers; independent publication. Editorial serif headlines, readable article body, newsprint/ink/one accent, story-led columns, visible bylines and carefully tiered headlines.
- **Pages and composition:** Home: masthead/topic nav → lead story with secondary rail → topic collections → author features → about/contact. Pages: /stories, /stories/story-slug, /topics, /authors, /about; footer includes editorial policy, corrections and contact.
- **Responsive transformations:** Phone orders lead story then chronological highlights; tablet uses lead-plus-rail; desktop exposes multiple editorial columns with capped article measure.
- **Customization and Design Lock:** Edit articles, authors, dates and image credits. Choose lead/collection arrangements and reorder editorial slots. Lock byline/date visibility, heading hierarchy and article reading width; subscriptions need a real service, not a decorative form.

### Voice

- **Identity:** `lucia.layout.voice`, version 1 proposed; Community, Nonprofit & Personal. Canonical direction: **Personal thought leader**. Signature: Biography; speaking; media features.
- **Visual language and audience:** Speakers and public thinkers; personal thought leader. Authoritative serif display and clean sans metadata, cream/ink/oxide, strong portrait essays, speaking topics and document-like media citations.
- **Pages and composition:** Home: biography/speaking nav → portrait proposition → speaking themes → published ideas → sourced media features → contact. Pages: /speaking, /writing, /media, /about, /contact; footer includes booking contact and citation notes.
- **Responsive transformations:** Phone puts topics and contact ahead of secondary biography; tablet pairs portrait and introduction; desktop uses editorial pull quotes with accessible reading order.
- **Customization and Design Lock:** Edit biography, talks, writing and verifiable media references. Choose portrait/text hero and reorder talk themes. Lock quote attribution and media evidence; no invented endorsements or book-sales controls.

### Heritage

- **Identity:** `lucia.layout.heritage`, version 1 proposed; Community, Nonprofit & Personal. Canonical direction: **Cultural archive**. Signature: Collection stories; exhibit timeline; initiatives.
- **Visual language and audience:** Museums and cultural archives; cultural archive. Scholarly serif with clear archive labels, parchment/ink/earth pigments, collection imagery, chronological exhibits and restrained framed artefacts.
- **Pages and composition:** Home: collection/exhibit nav → featured cultural story → collection index → exhibit timeline → initiatives → visit/contact. Pages: /collections, /objects/object-slug, /exhibits, /visit; footer keeps provenance, rights and cultural-use guidance.
- **Responsive transformations:** Phone places provenance next to each object; tablet pairs object and context; desktop supports archive indexes and timeline spreads with equivalent text order.
- **Customization and Design Lock:** Edit object metadata, provenance, dates and rights. Choose exhibit timeline/object index and reorder collections. Lock rights, sensitivity notices and chronological ordering where factual; no unlicensed cultural imagery.

### Collective

- **Identity:** `lucia.layout.collective`, version 1 proposed; Community, Nonprofit & Personal. Canonical direction: **Membership community**. Signature: Benefits; chapters; membership enquiry.
- **Visual language and audience:** Professional or interest associations; membership community. Editorial sans with restrained serif accents, navy/cream/clay, benefits comparison, chapter stories and compact governance information.
- **Pages and composition:** Home: benefits/chapters nav → community purpose → membership benefits → chapters → governance → membership enquiry. Pages: /membership, /chapters, /governance, /contact; footer exposes policies, eligibility and official contacts.
- **Responsive transformations:** Phone prioritizes eligibility and enquiry; tablet pairs benefits and chapter stories; desktop uses a clear benefits comparison with a quiet factual side rail.
- **Customization and Design Lock:** Edit membership categories, eligibility, chapters and policies. Choose benefits list/comparison and reorder chapter highlights. Lock eligibility/fee disclosures; this is an enquiry website unless real membership tooling is connected.

## Property, Health & Local Services

### Estate

- **Identity:** `lucia.layout.estate`, version 1 proposed; Property, Health & Local Services. Canonical direction: **Cinematic property**. Signature: Property showcase; location guides; viewing enquiry.
- **Visual language and audience:** Property agencies and developments; cinematic property. Refined serif and compact property-fact sans, warm white/charcoal/olive, cinematic exterior imagery, strong plan/specification panels and deliberate image pacing.
- **Pages and composition:** Home: property/location nav → cinematic development hero → property showcase → floor-plan/fact comparison → neighbourhood guide → viewing enquiry. Pages: /properties, /properties/property-slug, /locations, /contact; footer contains agent identity and listing disclosures.
- **Responsive transformations:** Phone shows price descriptors and property facts before galleries; tablet pairs image/facts; desktop uses a spacious visual property index plus contained comparisons.
- **Customization and Design Lock:** Edit listings, plans, area units, indicative prices and locations. Choose listing rows/gallery and reorder properties. Lock unit/price qualifiers, availability update dates and disclosure text; no fictitious reservations or investment returns.

### Care

- **Identity:** `lucia.layout.care`, version 1 proposed; Property, Health & Local Services. Canonical direction: **Calm healthcare**. Signature: Services; practitioners; appointment enquiry.
- **Visual language and audience:** Clinics and health practices; calm healthcare. Humanist sans and reassuring serif emphasis, white/deep teal/muted sage, service pathways, authentic practitioner profiles and highly readable access information.
- **Pages and composition:** Home: services/practitioners nav → care invitation → service pathways → practitioner directory → visit preparation → appointment enquiry. Pages: /services, /practitioners, /patients, /contact; footer contains credentials, emergency guidance and privacy contact.
- **Responsive transformations:** Phone prioritizes contact and emergency disclaimers; tablet pairs practitioner and qualifications; desktop uses calm service sequences without overwhelming card density.
- **Customization and Design Lock:** Edit service scope, credentials, access details and enquiry contact. Choose directory/list pathways and reorder nonurgent services. Lock emergency notices, qualification evidence and health-claim boundaries; no clinical records or fake bookings.

### Build

- **Identity:** `lucia.layout.build`, version 1 proposed; Property, Health & Local Services. Canonical direction: **Precision construction**. Signature: Before-after projects; build stages; capabilities.
- **Visual language and audience:** Builders and contractors; precision construction. Strong technical sans, charcoal/white/safety amber, project-site photography, before/after pairs and precise staged-process diagrams.
- **Pages and composition:** Home: projects/services nav → completed-project hero → before/after projects → build stages → capabilities → quote enquiry. Pages: /projects, /projects/project-slug, /services, /contact; footer lists operating area, credentials and insurance evidence.
- **Responsive transformations:** Phone uses separate labelled before/after frames instead of drag-only controls; tablet pairs project facts and images; desktop creates technical project spreads and readable stages.
- **Customization and Design Lock:** Edit projects, scope, stages, regions and evidence. Choose paired/sequential project imagery and reorder project stories. Lock before/after labels, stage chronology and credential evidence; no fabricated cost-estimate tools.

### Motion

- **Identity:** `lucia.layout.motion`, version 1 proposed; Property, Health & Local Services. Canonical direction: **Sporty automotive**. Signature: Service selector; workshop stories; booking enquiry.
- **Visual language and audience:** Automotive workshops; sporty automotive. Condensed but legible display sans, graphite/white/racing red, workshop imagery, structured service selectors and sharp but usable panel shapes.
- **Pages and composition:** Home: services/visit nav → workshop hero → service selector → process and technician stories → practical FAQs → booking enquiry. Pages: /services, /workshop, /visit, /contact; footer keeps hours, address and warranty conditions.
- **Responsive transformations:** Phone exposes service names as direct links rather than hover menus; tablet pairs selector and process; desktop uses a confident service-led split with documentary workshop shots.
- **Customization and Design Lock:** Edit services, vehicle categories, hours and technicians. Choose service list/selector with real filtering and reorder service groups. Lock service exclusions, warranty qualifiers and touch sizes; appointment confirmation requires real scheduling.

### Local

- **Identity:** `lucia.layout.local`, version 1 proposed; Property, Health & Local Services. Canonical direction: **Friendly neighborhood**. Signature: Service area; opening hours; reviews; contact.
- **Visual language and audience:** Neighbourhood service businesses; friendly neighborhood. Open humanist sans, cream/ink/brand accent, modest local imagery, compact service-area facts and practical hours/contact modules.
- **Pages and composition:** Home: services/contact nav → useful local proposition → service areas → services → sourced reviews → hours and contact. Pages: /services, /area, /about, /contact; footer repeats business identity, hours and accessibility details.
- **Responsive transformations:** Phone places click-to-call/contact and hours early; tablet pairs service area with offers; desktop keeps useful density rather than a huge empty hero.
- **Customization and Design Lock:** Edit services, areas, hours, contact and consented review quotes. Choose area list/static diagram and reorder services. Lock review attribution, opening hours and contact labels; no invented live ratings or location tracking.

### Greenfield

- **Identity:** `lucia.layout.greenfield`, version 1 proposed; Property, Health & Local Services. Canonical direction: **Agricultural contemporary**. Signature: Farm story; produce catalogue; sustainability.
- **Visual language and audience:** Farms and agricultural cooperatives; agricultural contemporary. Grounded serif with technical crop labels, field green/cream/soil, seasonal farm photography, produce narratives and measured sustainability evidence.
- **Pages and composition:** Home: farm/produce nav → landscape farm story → produce catalogue → farming practices → evidence-backed sustainability → trade enquiry. Pages: /produce, /our-farm, /practices, /contact; footer includes sourcing, seasonal updates and farm contact.
- **Responsive transformations:** Phone orders produce facts and enquiry before expansive landscape imagery; tablet pairs crop and practice stories; desktop alternates wide field images with narrow agronomy narratives.
- **Customization and Design Lock:** Edit crops, seasons, growing practices and evidence references. Choose crop catalogue/story sequence and reorder produce. Lock provenance, certification evidence and seasonal qualifiers; no fabricated yields, stock or sustainability statistics.

## Eight flagship implementation briefs

These are Phase 13/14 build briefs, not implemented websites. Each requires a distinct first page, internal-page recipe and content replacement test before expansion. The sections named here are proposed registered components to build, not a second renderer or an allowance to inject code. Exact typeface files must be licensed and self-hosted; semantic font roles below are design decisions, not approval to fetch external fonts at runtime.

#### Flagship: Meridian

- **Token/composition starting point:** `ink #10263D`, `paper #F5F1E8`, `accent #9D793B`; display serif 56–76px desktop / 36–44px phone, body 17–19px; 12-column grid, 24/32px gutters, square images.
- **First registered section work:** `hero-offset` (statement/portrait), `credentials-strip` (evidence-only), `service-chapters` (numbered narrative), `case-study-rail` (linked real case pages), `consultation-contact`.
- **Page deliverable:** Home plus /services, /work, /work/case-slug and /contact. A case page needs problem/approach/evidence/results-with-source/contact rather than cloning home.
- **Responsive acceptance:** The first phone screen must expose proposition and consultation action without hiding either behind an image. At 768px use a readable stacked/tablet hybrid; at 1440px the off-axis editorial balance must survive a two-line and a five-line title.
- **Content/asset handoff:** One licensed portrait, three rights-cleared case images, variable-length service text and truthful evidence samples. Test empty credential state, long firm name, five cases and one case.
- **Design rejection rule:** Reject if it resembles the SaaS Nexus product canvas or repeats the same three-card hero/grid.

#### Flagship: Canvas

- **Token/composition starting point:** `ink #232323`, `paper #FAF8F4`, restrained user-selected accent only; sans captions 13–15px with body 17px, artwork spacing 24/48/80px, borderless images.
- **First registered section work:** `art-index` (mixed image ratios), `project-essay-preview`, `artist-bio`, `commission-contact`. No marketing metrics strip or service-card grid.
- **Page deliverable:** Home plus /work/project-slug, /about and /contact. Project pages need image/caption sequences and a real essay, not generated filler.
- **Responsive acceptance:** At 390px every caption follows its image in DOM order. At 768px pair selected work with intentionally uneven ratios; desktop retains artwork-led scale without stretching low-resolution assets.
- **Content/asset handoff:** Six licensed artwork examples spanning portrait/landscape/square, captions, credits and a 600-word project essay. Validate missing-image fallback without layout collapse.
- **Design rejection rule:** Reject if project thumbnails become an equal-size generic card wall or if artwork is decorative filler.

#### Flagship: Haven

- **Token/composition starting point:** `ink #243B32`, `paper #F5F0E7`, `accent #A17C49`; warm serif headings with practical sans facts, wide panorama bands, 16px maximum card radius used sparingly.
- **First registered section work:** `property-tour-hero`, `room-comparison`, `amenity-story`, `local-guide`, `stay-enquiry`.
- **Page deliverable:** Home plus /rooms, /rooms/room-slug, /experiences, /location and /enquire. Each room needs size, occupancy, amenities, indicative price qualifiers and real enquiry contact.
- **Responsive acceptance:** 390px puts room facts and enquiry before secondary imagery; 768px uses paired room facts; 1440px juxtaposes panoramas with calm comparison rows. Comparisons remain labelled after stacking.
- **Content/asset handoff:** Licensed property panorama, two room sets, truthful amenity/location facts and explicit indicative pricing. Test long room names and unavailable imagery.
- **Design rejection rule:** Reject any fake date availability, successful booking, invented rating or carousel required to find contact.

#### Flagship: Academia

- **Token/composition starting point:** `ink #142C4A`, `paper #FAF8F1`, `accent #9A752F`; formal serif display with 17px accessible institutional body, compact utility labels and carefully ruled directories.
- **First registered section work:** `institutional-hero`, `programme-directory`, `admissions-steps`, `department-feature`, `news-ledger`, `official-contact`.
- **Page deliverable:** Home plus /programmes, /programmes/programme-slug, /admissions, /departments, /news and /contact. Programme pages have eligibility, duration, curriculum and official next steps.
- **Responsive acceptance:** Phone prioritizes admissions/programme tasks and visible navigation; tablet pairs programme directory with admissions; desktop supports multi-column directories with keyboard-accessible navigation.
- **Content/asset handoff:** Licensed campus/student imagery with consent, realistic programme names, accurate date examples and explicit demo accreditation labels. Test 3 and 30 programme entries without text clipping.
- **Design rejection rule:** Reject if it is a generic commercial hero with three services, or if an application button has no real destination.

#### Flagship: Maison

- **Token/composition starting point:** `ink #171717`, `paper #F7F4EE`, campaign accent only; editorial serif headlines, 12–14px collection metadata, generous fashion-spread margins with high image quality.
- **First registered section work:** `campaign-spread`, `collection-editorial`, `lookbook-sequence`, `garment-detail`, `collection-enquiry`.
- **Page deliverable:** Home plus /collections, /collections/collection-slug, /story and /enquire. Collection pages need full looks, materials, sizing/care and credits, not a fictitious cart.
- **Responsive acceptance:** Phone uses deliberate portrait crops with focal points and captions; tablet uses paired looks; desktop reads as a commissioned magazine spread. Cropping cannot remove important product detail.
- **Content/asset handoff:** Rights-cleared campaign/garment imagery, size guidance and authentic materials data. Test a collection with two looks and another with twelve, including long captions.
- **Design rejection rule:** Reject generic storefront cards as the whole composition, decorative “Buy” controls or claims of stock without a backend.

#### Flagship: Nexus

- **Token/composition starting point:** `ink #11243A`, `paper #F7F9FC`, `accent #136C94`; clean sans body and restrained mono product labels, crisp 8px corners and strong screenshot/text relationships.
- **First registered section work:** `product-canvas`, `workflow-walkthrough`, `feature-comparison`, `integration-overview`, `demo-contact`.
- **Page deliverable:** Home plus /product, /solutions, /integrations, /documentation and /contact. Solution pages need a distinct role/problem/workflow narrative. Documentation links must resolve.
- **Responsive acceptance:** Phone stacks screenshot before each explanation and converts comparison columns into labelled groups; tablet pairs walkthrough steps; desktop uses a 7/5 product canvas.
- **Content/asset handoff:** Legitimate product screenshots or clearly labelled static demo screens, actual feature-status data and supported integrations. Test missing integration state, long feature names and keyboard alternatives to tabs.
- **Design rejection rule:** Reject fake dashboards, subscription checkout, invented customer logos or product buttons with no implemented destination.

#### Flagship: Impact

- **Token/composition starting point:** `ink #1D4133`, `paper #FAF4E8`, `accent #9B6B2E`; warm humanist body and restrained serif emphasis, story-first image bands and readable evidence ledgers.
- **First registered section work:** `human-story-hero`, `programme-journey`, `impact-ledger`, `volunteer-opportunity`, `safeguarding-contact`.
- **Page deliverable:** Home plus /programmes, /programmes/programme-slug, /impact, /volunteer, /about and /contact. Programme pages must connect need, activity and evidence without fabricated outcomes.
- **Responsive acceptance:** 390px preserves mission/participation without making the hero image a barrier; tablet pairs programme narrative and evidence; desktop alternates emotional stories with sourced facts.
- **Content/asset handoff:** Consented community imagery, programme text, cited example evidence and accessible volunteer contact. Test missing metrics (show narrative, never zero-filled fake outcomes).
- **Design rejection rule:** Reject invented donations, live counters, manufactured impact statistics or an unconnected payment form.

#### Flagship: Estate

- **Token/composition starting point:** `ink #28332D`, `paper #F6F3EC`, `accent #8C704B`; refined serif display with compact sans property facts, generous image spreads and precise square plan/specification modules.
- **First registered section work:** `property-cinematic-hero`, `listing-showcase`, `floor-plan-facts`, `neighbourhood-guide`, `viewing-enquiry`.
- **Page deliverable:** Home plus /properties, /properties/property-slug, /locations and /contact. A listing page needs unit-labelled area, qualified price, location, plan descriptions and disclosure.
- **Responsive acceptance:** Phone exposes facts before the gallery; tablet pairs image/facts; desktop uses an expansive photographic index and contained comparison. Plans always have text equivalents.
- **Content/asset handoff:** Rights-cleared property photos/plans, verifiable dimensions, indicative price qualifiers and update dates. Test unavailable-listing notice and absent plan without inventing inventory.
- **Design rejection rule:** Reject fake viewing reservations, financial returns, sale status or image-only floor-plan information.

## Premium quality gates and originality enforcement

Every implementation must pass functionality/security and the canonical eight-part rubric: originality, visual polish, completeness, responsiveness, usability, accessibility, customization resilience and performance, each 0–5. Target **32/40**, no part below **3/5**. A score never overrides a broken link, tenant leak, false transaction, invalid publication or inaccessible essential control.

For each candidate, capture actual rendered pages at 390, 768, 1180 and 1440 CSS px; inspect navigation and content flow, not only screenshots. Compare hero geometry, section sequence, grid, typographic roles, navigation character, imagery/crop rules and responsive transformations side by side. A recoloured/rewritten sibling fails originality even if its numeric score passes. Compare DOM/registered-section fingerprints as well as images: today's common hero/grid/contact sequence is the baseline to improve, not an acceptance target.

Test long/short names, missing licensed imagery, 200% text scaling, keyboard/focus, reduced motion, useful alt text, contrast, real contact destinations, dense content and 1-item versus many-item collections. No image-only essential text, autoplay dependency, drag-only interaction or faux live statistics. Previews, creation, saved edits, refresh and publication must use the same validated composition and preserve customer modifications. Build success alone never certifies visual quality.

## Phase 13 handoff and Phase 12 acceptance

1. Preserve the legacy SiteDraft/v1 reader and existing published websites. Implement an explicit versioned composition extension within the current blueprint/renderer and page persistence, not a second engine.
2. Build the minimum real registered primitives needed by the eight flagships, including content schemas, responsive transformations, safe assets and tests. Do not claim a variant before it has a working renderer and controls.
3. Connect page-aware preview/editor/public rendering, atomic revisioned saves/publication, content-safe Design Lock/undo and the guided/advanced capability model.
4. Implement and review the eight distinct flagship websites in Phase 14 before expanding to 16/32/48. Secure licensed imagery and demonstrate accurate previews and real project selection.
5. Keep standard websites free, Store/Paystack entitlements separate and S3 deferred. No credentials, buckets, new DB service or false commerce UI are required by this handoff.

**Phase 12 decision: PASS.** All 37 current starters were instantiated, validated and rendered through the actual shared renderer in the executed inventory suite. All six actual renderer families passed browser geometry checks at 320, 390, 768, 1180 and 1440 CSS px. Automated consistency checks verify the exact 48 canonical names/categories and proposed IDs, meaningful visual/page/responsive/customization brief fields and the eight flagship handoffs. The full suite passed 500 tests across 62 files. [Phase 11 evidence](phase-11-website-foundation.md#verification-evidence) records the real browser/HTTP results and screenshots; exact release CI/deployment evidence belongs to the final PR head. This decision concerns architecture and design readiness only: **zero of the new 48 Layouts is claimed implemented, previewed or published by this phase**.
