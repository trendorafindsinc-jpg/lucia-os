# LUCIA OS

LUCIA OS is a multi-tenant product operating system for organisations and people to create and publish websites, sell and buy through Store, use category-specific Portals, manage company day-to-day activities through Business Admin, and participate in the Loom business community.

One application deployment serves many organisations; customer-specific deployments are not the design.

## Governing product documentation

- [Unified Platform Blueprint](docs/unified-platform-blueprint.md) — canonical product boundaries, navigation, Store, Portals, Business Admin, Loom, security, entitlements, and acceptance principles.
- [30-Phase Implementation Roadmap](docs/implementation-roadmap-30-phases.md) — implementation order, dependencies, acceptance gates, and Codex checkpoint format.
- [Website Engine Blueprint](docs/website-engine-blueprint.md) — Loom Library, Loom Blueprint, Layer Studio, LoomifiAI, preview, save and publishing contract.
- [Architecture](docs/architecture.md) — system boundaries and technical baseline.
- [LUCIA Core authentication-only boundary](docs/core-auth-only-boundary.md) — Core authenticates; LUCIA OS owns local authorization and product data.
- [Engineering Standards](docs/engineering-standards.md) and [Security Baseline](docs/security-baseline.md).

Repository-wide agent instructions are in [AGENTS.md](AGENTS.md). Codex and other coding agents must read these instructions and the governing blueprint/roadmap before changing code.

## Product navigation

The approved first-class destinations are:

- **Overview** — workspace status and next actions.
- **Websites** — Layouts, Layer Studio, pages, drafts, domains, preview and publishing.
- **AI Studio** — optional loomifyAI assistance; AI is not required to create or operate a website.
- **Store** — tailored to sellers and buyers.
- **Portals** — tailored to the workflows and controls of each approved category.
- **Business Admin** — tailored to companies managing day-to-day activities.
- **Loom** — a first-class business community for discussions, groups, business discovery, connections, messaging and collaboration.
- **Plan & Billing** — subscriptions, usage and premium entitlements, subject to permissions.

Supporting tools may appear contextually inside Websites where that creates a clearer connected experience.

## Non-negotiable product boundaries

- LUCIA Core / LUCIA ID provides global authentication only. LUCIA OS owns its organisations, memberships, roles, permissions, tenant data, billing, subscriptions and entitlements.
- A valid LUCIA ID does not automatically grant access to an organisation, portal, Store operation, or premium capability.
- Tenant isolation and authorization are enforced server-side for every protected read, write, render, job, webhook, and export.
- Roles, paid entitlements, and Loom business verification are separate concepts.
- Website creation by template, manual editing, or AI must use the same validated Blueprint, persistence, preview and publication pipeline.
- No inert controls, fake progress, simulated success, client-trusted payment state, or silent cross-tenant access.
- Failed save/publish operations preserve the last known-good live site. Commerce/payment operations must be idempotent and recoverable.
- Features are not production-ready merely because documentation exists or a build passes; follow the roadmap acceptance gates.

## Technology baseline

- Next.js App Router + TypeScript
- Neon PostgreSQL + Drizzle ORM
- Vitest for unit/integration tests; browser-level tests for critical user journeys
- Vercel for application hosting
- S3-compatible object storage behind an adapter
- Provider adapters for payments and other external services

## Local development

Prerequisites: Node.js LTS and npm.

```sh
npm install
cp .env.example .env.local
npm run dev
```

The app should start without production credentials. Features requiring external services must fail safely and explain configuration requirements; do not add fake production data or silently bypass authorization.

## Phase and release discipline

The [30-phase roadmap](docs/implementation-roadmap-30-phases.md) is the single index for phase order and acceptance. Audit actual code and test evidence before updating phase status. Work in narrow, reviewable slices; test before merge. Do not perform destructive migrations, production resets, DNS changes, or deployments without explicit approval. Do not merge to `main` until required verification is complete and the user explicitly authorises the merge.
