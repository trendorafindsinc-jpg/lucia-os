# LUCIA OS Website Engine Blueprint

**Status:** Product and architecture baseline for Website Engine v1  
**Scope:** Blueprint and implementation contract; this document does not claim the described features are already implemented.  
**Repository:** `trendorafindsinc-jpg/lucia-os`

> **Current naming update (supersedes legacy customer-facing terms below):** **Loom** is the business community product; **Layouts** is the website template library; **Layer Studio** is the website editor; **loomifyAI** is the optional AI assistant; **Website Blueprint** is the validated website definition. This document was originally written with “Loom” as a website template and “LoomifiAI” as the assistant. Treat those as legacy terminology, not current UI naming. New customer-facing surfaces and new documentation must follow [Unified Platform Blueprint](unified-platform-blueprint.md). Do not rename persisted identifiers or internal code without a compatibility plan.

## 1. Product direction

LUCIA OS is a durable, multi-tenant software platform. Version 1 prioritises an excellent website engine. The engine must deliver premium, distinct websites quickly through curated designs and a connected visual editor. AI is an optional creation shortcut—not a required gateway and not a runtime dependency for websites that have already been created.

The intended customer outcome is simple: a customer can select a suitable design, make it their own, preview it accurately, and make it available online with minimal friction. A polished starting point should compress days of design and implementation work into minutes without making every site look alike.

**Core principle:** LUCIA owns the engine, the design standards, the saved website format, the renderer, and the delivery workflow. AI can assist, but it does not own or replace those foundations.

## 2. Canonical product language

Use plain, pronounceable customer-facing language consistently. Do not expose internal JSON, schema identifiers, model names, provider names, or infrastructure jargon in normal customer workflows.

| Concept | LUCIA language | Meaning |
| --- | --- | --- |
| Website template/design starting point | **Loom** (plural: **Looms**) | A complete, reusable website composition—not merely a colour variation or card of metadata. |
| Catalogue of designs | **Loom Library** | Where customers discover and choose a Loom. |
| Website workspace and visual editor | **Loom Studio** (short UI label: **Studio**) | Where customers edit content and design, save changes, and preview their site. |
| Machine-readable website definition | **Loom Blueprint** | A versioned, validated structured document consumed by the website engine. It may be JSON internally; customers do not need to edit raw JSON. |
| Optional AI website creation assistant | **LoomifiAI** | Turns a customer’s natural-language brief into a proposed Loom Blueprint and sends it through the same validation and save path as other designs. |
| Preview action | **Preview** | Shows the actual site output without changing the live version. |
| Make the site available online | **Go Live** *(working label; final naming can be decided separately)* | The explicit action that promotes a validated version to the live site. |
| Currently served website | **Live Site** *(working label)* | The version visitors can access on the assigned address/domain. |

Internal source code can retain existing names such as `template` while migration is incremental. Customer-facing copy should adopt the LUCIA vocabulary consistently, and aliases should not create duplicate concepts in the data model.

## 3. Website Engine v1 scope

### Required

1. **Distinct premium Looms.** Every Loom defines a complete composition: page structure, section order, visual hierarchy, typography, spacing, responsive rules, imagery/content slots, navigation, and supported interactions. Designs must be recognisably different in structure, not just palette and labels.
2. **Faithful Loom previews.** Library previews must be miniature renderings of the actual Loom composition (or a deterministic representation generated from the same Blueprint and renderer). Generic placeholder cards that make all designs appear alike do not meet the bar.
3. **Connected visual editing.** Customers can edit supported site elements—such as header, navigation, sections, text, imagery, colours, typography, and layout settings—through clear visual controls. Changes must map to the saved Blueprint and be reflected in preview.
4. **One engine for all creation paths.** A curated Loom, a manually edited site, and a LoomifiAI-generated site must all use the same validated Blueprint contract, renderer, persistence layer, preview mechanism, and live-version workflow.
5. **Accurate preview.** Preview must render the saved or explicitly staged website version at desktop and mobile sizes. It must not be a disconnected mockup. Previewing must not overwrite or publish the live version.
6. **Safe save and version promotion.** Saving a draft, previewing it, and promoting it to the Live Site are distinct, explicit operations. A failed save or promotion must preserve the previous valid/live version and clearly explain the failure and retry path.
7. **Tenant isolation.** All website definitions, drafts, assets, versions, and domain associations are scoped to the authorised organisation. Tenant IDs and hostnames are locators, never authorisation.
8. **Accessibility and performance.** Generated and curated output must use semantic structure, keyboard-accessible controls, visible focus, responsive layouts, optimised assets, and reasonable loading performance.
9. **Regression safety.** Changes to the engine must preserve existing customer websites and their live versions. The two currently working published customer sites are critical regression checks; do not migrate or overwrite their data merely to introduce Looms.

### Not required to enter through AI

AI must never be required to browse the Loom Library, choose a Loom, use the editor, save, preview, or make a site available online. If AI is unavailable, rate-limited, or too costly, non-AI website creation and existing websites must continue to work.

## 4. Loom Blueprint contract

The Blueprint is the stable interface between design creation and the engine. Its schema must be versioned, validated, documented, and covered by compatibility tests before it becomes the format of record.

At minimum, a Blueprint should represent:

- **Identity and compatibility:** schema version, stable Loom ID, revision, and supported engine capabilities.
- **Site configuration:** site purpose, locale, metadata, theme tokens, fonts, and global layout settings.
- **Pages and navigation:** stable page IDs, routes, titles, navigation order, and not-found behaviour.
- **Composition:** ordered sections and typed component references, with section-specific configuration and content slots.
- **Design system:** colour tokens, typography scale, spacing, radii, borders, shadows, content widths, and responsive breakpoints.
- **Assets:** tenant-scoped asset references and safe alt text; no arbitrary remote fetches or unsafe asset paths.
- **Interactions:** only explicitly supported, typed interactions with defined inputs and outcomes.
- **Responsive behaviour:** layout rules for small, medium, and large viewports.
- **SEO and accessibility:** title/description fields, canonical metadata where applicable, heading structure, labels, and accessibility checks.
- **Capabilities and validation:** declared feature requirements, limits, migration/compatibility rules, and machine-readable validation errors.

### Blueprint safety rules

- Treat AI output, imported Blueprints, user content, and asset metadata as untrusted input.
- Validate the entire document server-side against the active schema and capability allowlist before persistence or rendering.
- Reject unknown executable fields, arbitrary scripts, unsafe HTML, unsafe URL schemes, and unapproved component types.
- Do not execute generated code from a Blueprint. The engine renders known, versioned components from validated configuration.
- Apply size, nesting-depth, page-count, section-count, and asset limits.
- Preserve stable IDs and explicit migrations when schemas evolve; never silently reinterpret an old Blueprint in a way that changes a live site.
- Store drafts and published/live versions separately or otherwise provide immutable, recoverable version history.
- AI must not be allowed to bypass tenant authorisation, billing/entitlements, content validation, or the normal live-version promotion checks.

## 5. LoomifiAI: optional, transparent creation flow

LoomifiAI is the optional assistant inside the website engine. It generates a proposed Blueprint; the engine—not the model—validates, stores, renders, and promotes it.

### Required flow

1. **Collect the brief.** Understand the website goal, audience, style, required pages, content, features, and any constraints. Ask only for essential missing information.
2. **Plan the site.** Convert the brief into an explicit page and section plan.
3. **Generate the Blueprint.** Produce structured data against the currently supported Blueprint schema. Do not claim unsupported components or capabilities.
4. **Validate.** Run schema, capability, safety, accessibility, and size checks. If validation fails, attempt a bounded repair or explain what needs to change.
5. **Save to the workspace.** Persist the validated draft under the correct tenant and return its actual workspace/site reference.
6. **Render and verify preview.** Generate a preview from the saved draft and verify that it can be rendered before declaring success.
7. **Hand back control.** Tell the customer the site is ready in Studio and provide a direct route to open it. The customer can inspect and edit it before choosing to make it live.

### Honest progress reporting

Progress must be driven by real task state, not a fake timer or pre-scripted sequence. Use clear customer language such as:

- Understanding your website brief
- Planning your pages and sections
- Creating your design Blueprint
- Checking the design against LUCIA standards
- Saving your draft to Studio
- Preparing your preview
- Your website is ready to preview

The interface should show current stage, meaningful progress when measurable, elapsed/waiting feedback, and a recoverable error if a stage fails. Do not show “saving”, “uploaded”, “ready”, or “complete” until the relevant operation has actually succeeded. If generation takes time, keep the customer informed and preserve the job state so a refresh or temporary network loss does not create a silent failure or duplicate site.

### Provider independence

LoomifiAI must call a provider-neutral AI interface. Model/provider selection, retries, timeouts, cost limits, and telemetry belong behind this interface. No individual AI provider may become a hard dependency of the website renderer or saved sites. Existing sites must render and remain manageable even when all AI providers are unavailable.

## 6. Loom Library and editor quality bar

Each Loom must have a design brief and a distinct composition. The Library should communicate its intended audience, strengths, page coverage, and supported features without misleading preview imagery.

Quality review should cover:

- Distinctive composition and clear visual hierarchy.
- High-quality typography, spacing, imagery, and responsive behaviour.
- Useful page/section combinations for the stated audience.
- Navigation, forms, links, and interactive states that actually work.
- Keyboard accessibility and semantic structure.
- Loading performance and asset behaviour.
- Realistic sample content that does not imply fake customer endorsements, business metrics, or functionality.
- A usable starting point after selection—not a decorative mockup that must be rebuilt from scratch.

A customer modification should create a tenant-owned draft/fork or equivalent isolated revision; it must not mutate the shared base Loom or another customer's website.

## 7. Platform layers and version boundaries

### Version 1 — Website Engine

Focus on the Loom Library, premium compositions, Loom Blueprint, visual editor, faithful preview, saving/versioning, domain routing, and reliable live-site delivery. LoomifiAI is optional and uses the same engine contract.

### Later layer — Commerce

Commerce can add store capabilities such as products, inventory, orders, payment integrations, reviews, and buyer/seller workflows. It must build on the same tenant isolation and website foundations. This is not permission to expand the current v1 implementation scope.

### Later layers — Specialist portals

School, agricultural, company, and other specialist portals should use LUCIA-owned, opinionated designs and workflows. Tenant users may customise explicitly permitted settings (for example, approved colour tokens), but cannot redesign protected authentication, permission, or core workflow surfaces. New design requests for protected portal experiences require an approved LUCIA-controlled process and, where appropriate, an enterprise arrangement.

### Shared infrastructure

Multitenancy, tenant-scoped persistence, authorization, audit, file storage, versioning, and provider adapters are platform infrastructure. AI is one replaceable capability behind an interface, not the system's foundation.

## 8. Security, persistence, and publishing boundaries

- LUCIA Core remains the global authentication authority only. LUCIA OS independently owns and enforces tenant membership, roles, permissions, content, websites, domains, subscriptions, and entitlements.
- Every read/write/render/export/background task must be authorised and tenant-scoped on the server.
- Use immutable organisation IDs for ownership. A hostname, URL, client-provided tenant ID, or generated Blueprint is not proof of permission.
- Use tenant-scoped object keys and authorise asset access. Never allow one tenant to reference another tenant's private assets.
- Saving a draft must not change the Live Site. Promotion must validate the exact draft revision, domain/tenant ownership, and required entitlements.
- Failed operations must not delete or replace the last known-good live version.
- Log security-relevant actions and task outcomes without logging credentials, tokens, or unnecessary customer content.
- Do not run destructive migrations, reset production data, alter DNS, or change live domains as part of a blueprint-documentation change.

## 9. Acceptance gates before implementation is considered complete

A phase is not complete merely because the UI looks finished. Evidence must exist for the relevant checks:

1. Schema tests cover valid Blueprints, invalid fields, unsupported capabilities, size/depth limits, and migrations.
2. Renderer tests cover each supported section/component and responsive variants.
3. Tenant-isolation tests prove cross-tenant reads, writes, assets, drafts, and version promotion are denied.
4. Editor tests prove changes round-trip through save and preview without losing content.
5. Preview tests prove the output uses the selected draft revision and does not change the live version.
6. Save/promotion failure tests prove the previous live version is preserved and errors are recoverable.
7. LoomifiAI tests cover provider timeout/unavailability, malformed output, schema rejection, repair limits, duplicate retries, progress state, and successful handoff to Studio.
8. Browser-level regression tests cover the customer journey and the two existing working published sites.
9. Lint, type-check, unit/integration tests, and production build must be run and inspected before proposing merge or deployment.
10. No feature may be described as production-ready until implementation and acceptance evidence support that claim.

## 10. Delivery discipline

Implement in small, reviewable phases:

1. Audit the existing renderer, editor, save path, preview path, and publishing flow; map current code to this contract.
2. Define and test the Blueprint schema and compatibility strategy.
3. Rebuild the Loom Library previews and compositions so each Loom is genuinely distinct.
4. Connect the editor and preview to the same Blueprint and renderer.
5. Verify safe saving and live-version promotion, retaining the last known-good site on failure.
6. Add LoomifiAI as an optional provider-independent generation workflow.
7. Verify customer-facing vocabulary and documentation.

Keep each phase scoped. Test before merge. Do not modify DNS or production infrastructure as part of template, editor, or AI work. Existing live customer websites are regression fixtures and must remain intact.
