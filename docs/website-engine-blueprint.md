# LUCIA OS Website Engine Contract

**Status:** Website Engine product contract; implementation status must be verified from code and tests.  
**Canonical product direction:** [LUCIA OS Product Vision and Contract](lucia-os-product-vision.md)  
**Repository:** `trendorafindsinc-jpg/lucia-os`

This document is a focused engineering contract for the Website Engine. The canonical product vision controls if any historical Website Engine assumptions conflict with it.

## 1. Free website creation is a core acquisition strategy

**Standard website creation and publishing are free.** This is a deliberate strategy to reduce adoption friction and bring customers into the LUCIA ecosystem.

- A customer can create and publish a usable standard website without buying a layout, subscribing, purchasing AI, or buying another Store product.
- The free website uses a supported LUCIA-provided address. Custom domains are an optional paid purchase/service discoverable through LUCIA Store.
- Layouts are polished, ready-to-personalise starting points and must not become a paywall for basic website creation.
- AI/loomifyAI is optional. Manual creation and Layout-based creation must work without AI provider credentials.
- Clearly disclose separately paid third-party/runtime services. Do not promise unlimited AI, custom domains, paid third-party APIs, or perpetual managed infrastructure as part of the free offer.

## 2. Canonical terminology

- **Website Engine:** the free website creation and publishing capability; a first-class workspace icon.
- **Layouts:** curated website designs. Do not use “templates” in new customer-facing UI.
- **Layer Studio:** the visual website creation/editing workspace.
- **Website Blueprint:** the versioned, validated internal website definition. Do not expose raw JSON as the customer editor.
- **loomifyAI:** optional AI assistance. It proposes content/structure but cannot bypass the normal validation and persistence pipeline.
- **Preview:** renders the requested draft without changing the live website.
- **Publish / Go Live:** promotes a validated version to live delivery only after server-side checks succeed.
- **Loom:** exclusively the professional community product, never a website design library or website editor.

Legacy persisted identifiers and internal names must not be changed casually. Any migration or compatibility change requires an explicit plan.

## 3. Layout quality contract

Every Layout must be an intentionally designed, ready-made website—not a colour swap or a title/content variation of the same skeleton.

Each Layout should have:
- Distinct structure, hierarchy, typography, spacing, navigation, imagery, colour system, components, and responsive composition appropriate to its purpose.
- Realistic demo content and imagery, complete relevant sections, working navigation, and coherent page-level composition.
- Desktop, tablet, and mobile layouts, accessible semantics/contrast/focus, keyboard operation, and reduced-motion support.
- Content that can be replaced without forcing customers to repair the design.
- A meaningful preview of the actual design before selection.
- A common validated Website Blueprint, save, preview, and publishing pipeline.

A catalogue of 36 means 36 meaningfully different designs, not 36 names or colours on one design. Compare actual screenshots and structures across device sizes; reject near-duplicates unless the design purpose is demonstrably different. Quality takes precedence over catalogue speed. The intended customer effort is primarily replacing demo content, not rebuilding navigation, spacing, sections, or layout.

## 4. Shared creation and publishing pipeline

Layout selection, manual creation, and AI-assisted creation must converge on the same validated Website Blueprint and persistence/publication workflow.

- Validate schemas and supported components server-side. Never execute arbitrary generated code.
- Keep drafts, revisions, previews, and published snapshots distinct.
- Preview must not modify the live version.
- A failed save/publish must preserve the previous known-good live website and report a useful recovery action.
- Report success only after the relevant server operation succeeds.
- Public rendering must not leak private drafts, assets, or another tenant's data.
- Domain registration, domain ownership/DNS verification, TLS, publication, and actual live rendering are separate states.
- Keep tenant ownership and permissions enforced on server actions, routes, APIs, assets, background work, and publishing operations.

## 5. Workspace integration

Website Engine and Layouts are discoverable from the signed-in workspace via clear icons/entries. The app shell adapts to mobile, desktop, and tablet as defined in the canonical product vision. Website projects, Layout selection, editing, preview, domains, and publishing should form one connected flow, not isolated tools.

## 6. Acceptance evidence

Before calling the Website Engine ready, record evidence for:
- Free create/edit/preview/publish flow without AI or purchase.
- Meaningfully distinct Layout previews and rendered websites at mobile/tablet/desktop widths.
- Demo-content replacement without broken navigation or missing sections.
- Validation and safe failure paths, including preservation of the previous live version.
- Tenant isolation and authorization for website/project/assets/domain/publishing operations.
- Accessibility, keyboard and touch interactions, reduced motion, and truthful loading/error/success states.

Documentation alone is not proof of implementation. Inspect the code, run the appropriate tests, and record actual results.
