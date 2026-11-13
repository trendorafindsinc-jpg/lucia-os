# Lucia OS — Phase 3 Design Intelligence Specification

> **Document ID:** LUCIA-PHASE-3-DESIGN-001  
> **Version:** 0.2  
> **Status:** Implementation delivered; full CI verification pending  
> **Date:** 2026-11-12  
> **Branch:** `development`  
> **Depends on:** Phase 1 architecture and Phase 2 Graph Engine

## 1. Purpose

Phase 3 establishes a deterministic, versioned library of design knowledge that the Composition Engine can select and the Rendering Engine can interpret. Design Intelligence is reusable platform knowledge; it is not customer website content and must not become a second website persistence model.

The system must work without AI, network access, user-specific inference, or runtime code downloaded from recipes.

## 2. Scope and boundaries

### In scope

- Versioned design foundations and semantic token contracts.
- Fixed, reviewed component, section, page-composition, and industry recipe manifests.
- Compatibility metadata and deterministic recipe selection.
- Responsive and accessibility expectations declared by recipes.
- Registry validation, duplicate/version checks, and explainable selection results.
- Tests for schema safety, compatibility, deterministic ordering, and unknown recipes.

### Out of scope

- Studio UI and visual token editor.
- Graph mutation or database persistence of recipe definitions.
- Full page composition into graph nodes (Composition Engine phase).
- Actual website rendering (Rendering Engine phase).
- Customer-facing AI generation or model calls.
- Runtime loading/evaluation of arbitrary code, JSX, CSS, HTML, URLs, or module paths from recipe data.

## 3. Architecture and ownership

Design Intelligence is a platform-owned, code-reviewed registry within the modular monolith. It supplies immutable recipe manifests by stable ID and version. Customer websites store stable recipe references and their own validated configuration in graph nodes; they do not copy the recipe catalogue into website records.

The Graph Engine remains the canonical source of website structure and relationships. Design Intelligence does not own pages, nodes, edges, customer assets, or published content. It does not mutate graph data.

The initial implementation uses a static in-process registry. Do not add database tables or migrations until catalogue scale, editorial workflow, and update/rollback requirements justify them.

## 4. Recipe layers

1. **Foundations:** semantic color, typography, spacing, radius, elevation, breakpoints, motion and content-width tokens.
2. **Component recipes:** buttons, links, cards, navigation, forms and other reusable interface elements.
3. **Section recipes:** hero, features, services, testimonials, pricing, gallery, FAQ and contact.
4. **Page compositions:** home, about, services, contact, blog index, product listing and landing pages.
5. **Industry recipes:** combinations and selection guidance for supported business categories.

Each recipe manifest declares:
- Stable namespaced ID and positive version.
- Layer and category.
- Supported graph node types.
- Required semantic token keys.
- Responsive behavior expectations.
- Accessibility expectations.
- Compatibility constraints and tags.
- Typed, JSON-safe defaults/metadata only; never executable source.

## 5. Deterministic selection

Selection receives explicit inputs: recipe layer, requested category/industry, required capabilities, available graph node types and available token keys. It returns compatible candidates in a stable order with an explainable match score/reasons. It must not invent customer facts, infer missing business details, or silently relax hard constraints.

Hard constraints include layer, node-type compatibility, required tokens, and explicitly requested capabilities. Optional category/tag matches may rank candidates but cannot override hard incompatibility. Ties are broken by stable recipe ID then version. Repeated calls with the same registry and inputs must produce identical results.

## 6. Safety and versioning

- Registry IDs are unique within the catalogue; recipe versions are explicit.
- Unsupported versions and unknown IDs fail closed with typed diagnostics.
- Only reviewed built-in manifests are executable inputs to later composition/rendering code.
- Recipe content cannot specify arbitrary imports, component names, script, event handlers, raw HTML, CSS, or external asset URLs.
- Token values are typed and validated; customer overrides must be validated against the same token contract.
- A recipe version is immutable. A changed recipe is published as a new version.
- Removing a recipe requires compatibility/deprecation handling; existing website references must remain resolvable or be explicitly migrated.
- Accessibility metadata is a declared expectation, not proof of runtime conformance; rendering and validation phases must test actual output.

## 7. Integration contracts

- Graph nodes may reference `recipeId` and `recipeVersion`; they must not embed executable recipe code.
- Graph schema validation remains independent from recipe catalogue availability. A later composition/validation adapter resolves references and reports missing or incompatible recipes.
- Composition Engine consumes recipe manifests and produces graph mutations through Graph Engine contracts.
- Rendering Engine consumes graph references plus the same immutable recipe version.
- Studio may browse and configure recipes later, but must not own catalogue definitions.

## 8. Acceptance criteria

- Typed contracts cover foundations and all four recipe layers.
- The registry contains only fixed, reviewed manifests.
- Invalid IDs, versions, token keys, node types, and unsafe executable fields are rejected.
- Deterministic selection enforces hard compatibility and stable tie-breaking.
- Selection results explain why each candidate matched or was rejected.
- Tests prove determinism, compatibility, fail-closed behavior, and version immutability assumptions.
- No database migration, production data change, old editor modification, AI dependency, or public rendering cutover is introduced by this phase's initial foundation task.

## 9. Implementation sequence

1. Establish contracts, registry boundaries, and focused tests.
2. Add validated design foundations and semantic token sets.
3. Add component and section recipe catalogue.
4. Add page-composition and industry recipe catalogue.
5. Add compatibility/selection diagnostics and integration adapters.
6. Run complete repository verification and review catalogue coverage before closing Phase 3.

## 10. Implementation coverage review

The current implementation on `development` includes:

- A validated, deeply immutable core foundation with semantic color, typography, spacing, radius, elevation, breakpoints, motion and content-width tokens.
- A reviewed static catalogue spanning all four recipe layers (component, section, page and industry), with data-only JSON defaults.
- Registry validation against the actual foundation token catalogue, exact ID-and-version lookup, and typed fail-closed diagnostics for missing IDs and unsupported versions.
- Deterministic hard-constraint filtering and soft category/tag ranking with stable ID/version tie-breaking and explainable results.
- A graph-reference resolver that validates recipe ID/version pairs and node-type compatibility without making Graph Engine persistence depend on catalogue availability.
- Manifest defenses against executable fields, event-handler keys, HTML-like strings, executable protocols, CSS imports and external URLs.
- No database migration, customer data copy, runtime code loading, network dependency or AI dependency.

The initial fixed catalogue contains 23 manifests. This is a reviewed baseline rather than a claim that every future industry or component has been catalogued. Full repository CI, including focused tests, full unit tests, typecheck, lint, production build and routing checks, remains the closure gate.