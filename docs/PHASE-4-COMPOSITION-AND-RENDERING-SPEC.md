# Lucia OS — Phase 4 Composition & Rendering Specification

> **Document ID:** LUCIA-PHASE-4-COMPOSITION-RENDERING-001  
> **Version:** 0.1  
> **Status:** Initial technical specification — implementation in progress  
> **Date:** 2026-11-13  
> **Branch:** `development`  
> **Depends on:** Phase 1 architecture, Phase 2 Graph Engine, Phase 3 Design Intelligence

## 1. Purpose

Phase 4 establishes deterministic engines that (a) turn explicit website requirements and approved Design Intelligence recipes into a valid canonical website graph and (b) render that graph as real, accessible, responsive website output.

The graph remains the only persistent authority for website structure and content relationships. Design Intelligence remains a platform-owned, immutable catalogue. Composition and rendering are adapters over those two contracts; neither creates a competing website document format.

This phase is an engine foundation, not the new Studio interface or a production publishing cutover.

## 2. Scope and non-goals

### In scope

- Typed, versioned composition request/result contracts.
- Deterministic requirement normalization and page/section planning.
- Deterministic recipe selection using the Phase 3 registry.
- Graph construction through Phase 2 node/edge contracts and validation.
- Explicit defaults and unresolved-requirement diagnostics.
- Stable, injectable ID generation so tests and retries can be reproducible.
- A renderer contract and allowlisted renderer registry for supported graph node/recipe combinations.
- Resolution of design tokens, shared data, and media references through typed interfaces.
- Responsive and semantic HTML output with safe text handling.
- Deterministic validation of unsupported or unresolved rendering dependencies.
- Unit, integration, security, accessibility-oriented and snapshot/regression tests.

### Out of scope

- Lucia Studio UI, canvas, inspector or preview shell (Phase 5).
- New customer-facing AI generation or model calls.
- Arbitrary code/JSX/HTML/CSS execution or runtime module loading from graph data or recipes.
- New graph persistence tables or database migrations unless a specific verified requirement emerges and is separately approved.
- Changes to legacy editor UI, existing public-site rendering, draft routes or publishing behavior.
- Production/shared database changes, live website cutover, deployments or customer data migration.
- Media upload/storage implementation (Phase 6); this phase only defines and consumes a resolver boundary.
- Blog and commerce rendering features beyond typed unsupported-feature diagnostics.

## 3. Architectural invariants

1. **Canonical graph:** the Phase 2 GraphDocument is the only input representation for website structure.
2. **Deterministic operation:** equal normalized requirements, registry versions, foundation, and ID source produce equivalent graph content and diagnostics.
3. **No fabricated facts:** never invent names, addresses, phone numbers, testimonials, credentials, prices, business claims, or media. Missing essentials remain diagnostics or explicit user questions.
4. **Explicit defaults:** defaults are platform-owned and documented; they must not masquerade as customer-provided facts.
5. **Hard constraints remain hard:** recipe selection may not relax layer, node-type, capability, or required-token incompatibility.
6. **Graph validation before output:** composition must validate the complete graph using Phase 2 validation before returning success.
7. **Safe rendering:** graph properties and recipe defaults are data, never executable instructions. Renderers are reviewed code registered in an allowlist.
8. **No arbitrary output injection:** use framework escaping for text/attributes; only narrowly defined, separately sanitized rich-content formats may produce rich markup.
9. **Shared references stay shared:** media and shared-data references resolve by stable IDs and do not duplicate underlying records.
10. **Responsive by contract:** supported renderers provide mobile-first output and respect the selected recipe's responsive metadata.
11. **Preview/publish parity:** this renderer contract is the common rendering foundation for future preview and publishing adapters; environment differences must not change graph semantics.
12. **Isolation:** no change to existing live routes or legacy rendering behavior in this phase.

## 4. Composition Engine

### 4.1 Input contract

A composition request is a bounded, strict, JSON-safe value containing:

- Request schema version.
- Website intent/category supplied explicitly by the caller.
- Explicit website identity and a deterministic ID factory supplied by the caller.
- Requested pages with stable request keys, titles and normalized paths.
- Requested section intents per page, each with stable request key, category, optional recipe preference and explicit capabilities.
- Available foundation ID/version and any explicitly supplied token availability.
- Optional user-provided content/data references and media asset IDs.
- Explicit constraints and a locale when supplied.

The request must not accept executable code, arbitrary component names, external URLs as renderer instructions, or free-form code templates. Input limits must bound page count, section count, string lengths and nested JSON size.

The engine must not infer business facts from an industry/category. Industry recipes may influence structure and design selection only.

### 4.2 Normalization and planning

The deterministic pipeline is:

1. Parse and validate the request.
2. Normalize page paths and reject collisions, traversal segments, malformed encodings and unsupported path forms.
3. Validate request-key uniqueness and explicit references.
4. Resolve the requested foundation by exact ID/version; fail closed if unavailable.
5. Build a deterministic page/section plan from supplied intent.
6. Identify missing required customer facts and unsupported requested capabilities.
7. Select recipes through Phase 3 hard constraints and stable ranking.
8. Resolve explicit recipe preferences exactly; never silently substitute an incompatible recipe.
9. Apply only reviewed recipe defaults and clearly identified platform defaults.
10. Build website, page, section and component nodes with typed containment and reference edges.
11. Validate recipe references and the complete graph.
12. Return a graph, normalized plan and explainable diagnostics; do not persist it.

### 4.3 Graph construction rules

- One website root per generated graph.
- Pages are connected to the website using `contains_page`.
- Sections are connected to pages using `contains_section`.
- Components are nested using `contains_component` only where the selected recipe and node model support it.
- Recipe references use `recipeId` and `recipeVersion` properties on compatible nodes.
- Design tokens, shared data, media and interactions use existing typed reference node/edge families; do not embed duplicate shared records.
- Ordering uses explicit edge order and is stable across equivalent requests.
- Canvas coordinates are never generated as website layout and are not part of the composition result.
- ID generation is injected; production callers may supply UUID generation, while tests may use a deterministic sequence. IDs are not derived from customer text unless a collision-safe scheme is explicitly specified.
- The engine returns operations or a complete candidate GraphDocument, but persistence remains the responsibility of the Graph Engine service.

### 4.4 Composition diagnostics

Diagnostics are typed, stable and actionable. At minimum:

- Invalid or unsupported request schema.
- Duplicate request keys or page paths.
- Unknown foundation/version.
- No compatible recipe.
- Explicit recipe preference not found/version unsupported/incompatible.
- Missing required capabilities or tokens.
- Missing customer-provided facts.
- Unsupported requested feature.
- Invalid media/shared-data reference.
- Invalid generated graph or graph schema version.

Each diagnostic has a stable code, severity, message, and relevant request key or graph node/edge ID when available. A partial plan may be returned only when clearly marked incomplete; it must never be reported as a valid completed graph.

## 5. Rendering Engine

### 5.1 Input and output contract

Rendering accepts a validated GraphDocument, an exact Design Intelligence foundation/recipe registry version, a target route, a viewport profile, and typed resolver implementations for media and shared data.

It returns a framework-neutral render result or a React server-renderable tree through an internal adapter, together with typed diagnostics. It does not write to the database, mutate the graph, fetch arbitrary remote code, or publish/deploy output.

### 5.2 Renderer registry

- Map supported recipe ID/version and graph node type pairs to reviewed renderer functions.
- Fail closed for unknown recipes, unsupported versions, unsupported node types and missing renderer implementations.
- Never import a module path or component name from graph properties or recipe defaults.
- Render only validated, known properties. Unknown or invalid properties produce diagnostics rather than being interpolated into markup.
- Keep renderer registration deterministic and inspectable.
- Keep shared component renderers composable and independent of the legacy editor component tree.

### 5.3 Supported initial rendering surface

The first vertical slice should support a deliberately small set:

- Website document shell and semantic landmarks.
- Page route/title and main content.
- Navigation links with accessible labels and active-route behavior.
- Hero section with heading, optional description and optional call-to-action.
- Feature/service card groups using structured text content.
- Contact information only when explicitly supplied.
- Responsive layout behavior from approved recipe metadata and foundation tokens.

Unsupported recipe types must return clear diagnostics; do not render misleading placeholders as if the feature worked.

### 5.4 Design token resolution

- Resolve semantic token paths against the exact selected foundation version.
- Convert token values to typed style values through renderer-owned mapping.
- Never accept arbitrary CSS strings, CSS declarations, selectors, URLs or style objects from graph properties.
- Provide a bounded, deterministic CSS-variable/token output for supported values.
- Validate unknown token paths and incompatible token value types before rendering.

### 5.5 Media and shared-data resolution

Define interfaces such as `MediaResolver` and `SharedDataResolver` that accept stable IDs and return typed, authorized metadata. The resolver owns tenant authorization and URL generation. The renderer must not trust arbitrary URLs from graph data.

Missing, inaccessible or unsupported assets produce explicit diagnostics. The renderer must not silently substitute unrelated imagery or fetch external URLs. The actual Media Engine integration is deferred to Phase 6.

### 5.6 Accessibility and responsive behavior

- Use semantic landmarks and heading order.
- Links and controls must have accessible names and keyboard behavior.
- Decorative media must be marked decorative; informative media requires explicit alternative text from trusted metadata.
- Do not fabricate alternative text from asset filenames.
- Honor reduced-motion preferences and recipe expectations.
- Provide mobile-first layout behavior; test at mobile, tablet and desktop viewport profiles.
- Recipe metadata is an expectation, not proof of conformance; tests must inspect actual rendered output.

## 6. Security, privacy and resilience

- Treat graph properties, recipe defaults, content values and resolver responses as untrusted data.
- Bound input sizes, graph traversal, output node counts and rendering depth.
- Detect duplicate IDs, dangling references, unsupported versions and cycles before rendering.
- Escape text and attribute values through React's normal rendering path.
- Do not use `dangerouslySetInnerHTML` for arbitrary graph values.
- If rich text is introduced, accept only a documented structured format and use the repository's sanitizer with a narrow allowlist; this is not required for the first vertical slice.
- Do not expose private media URLs or bypass resolver authorization.
- Avoid cross-tenant resolver caches; cache keys must include tenant/security scope or use request-local resolution.
- Rendering and composition are pure with respect to persistence and must not change existing customer records.

## 7. Module boundaries and proposed layout

Initial code should live in focused modules, subject to repository conventions:

- `src/lib/composition/contracts.ts`
- `src/lib/composition/normalize.ts`
- `src/lib/composition/compose.ts`
- `src/lib/composition/diagnostics.ts`
- `src/lib/rendering/contracts.ts`
- `src/lib/rendering/registry.ts`
- `src/lib/rendering/render.ts`
- `src/lib/rendering/tokens.ts`
- `src/lib/rendering/resolvers.ts`

Keep public API routes and Studio UI out of the first engine increment. Do not create empty modules merely to match this proposed layout; add them with the first implementation that needs them.

## 8. Implementation sequence

1. **Contracts and composition planning:** strict request/plan/diagnostic schemas, normalization, deterministic ID injection and focused tests.
2. **Graph construction:** recipe selection, node/edge generation, graph and recipe-reference validation, determinism and failure tests.
3. **Rendering contracts:** typed render context, viewport profiles, resolver interfaces, diagnostics and allowlisted registry.
4. **Initial renderer vertical slice:** website/page shell, navigation, hero and structured feature/service sections with responsive semantic output.
5. **Token and reference integration:** exact foundation token resolution and typed media/shared-data resolution boundaries.
6. **Hardening:** security tests, malformed graph tests, accessibility-oriented output checks, deterministic snapshots and resource limits.
7. **Full verification:** focused tests, full unit suite, typecheck, lint, production build and routing checks. Add disposable database coverage only if the phase introduces persistence (which is not planned).

Each increment must be small, committed to `development`, and verified before the next dependent increment. Do not start Phase 5 until Phase 4 acceptance and complete CI pass.

## 9. Acceptance criteria

- Composition request, plan, result and diagnostics have strict, versioned contracts and bounded JSON-safe inputs.
- Equivalent requests with equivalent dependencies and ID factory produce equivalent graph content and diagnostics.
- Generated graphs pass Graph Engine structural/property validation and Design Intelligence recipe-reference resolution.
- No customer facts or external media are invented.
- Recipe selection respects hard constraints and exact version references.
- Renderer uses an allowlist of reviewed implementations and never evaluates graph/recipe data as code.
- Rendering output is semantic, accessible by construction, mobile-first and responsive across supported viewport profiles.
- Tokens resolve only against the exact foundation version.
- Media/shared-data resolution is typed and authorization-aware; unresolved references fail with diagnostics.
- Unknown recipe/node/version and malformed properties fail closed.
- Focused and full verification pass on the exact latest commit.
- No database migration, production route cutover, old editor change, customer data migration, deployment or destructive action occurs in this phase.

## 10. Phase status

The Phase 4 specification is the initial approved implementation boundary. Implementation and verification are in progress. Acceptance remains open until all criteria above are met.
