# LUCIA OS

LUCIA OS is a connected, device-adaptive technology workspace. Its product vision combines free website creation and publishing, premium ready-made Layouts, Loom's verified professional network, and LUCIA Store's technology marketplace. Customers can acquire eligible applications and launch them from workspace icons; selected products may support white-label and commercial deployment under explicit licences.

**The standard Website Engine is free.** This is a deliberate customer-acquisition strategy. Paid products and services—such as custom domains, optional costly AI, and separately licensed software—must be clearly distinguished from the free website offer.

One application deployment serves many organisations; customer-specific deployments are not the architecture.

## Governing documentation

- [LUCIA OS Product Vision and Contract](docs/lucia-os-product-vision.md) — **canonical** product scope, four sections, terminology, free website strategy, Layout quality, Loom verification, Store version/licence model, and delivery order.
- [Implementation Roadmap](docs/implementation-roadmap-30-phases.md) — sequential delivery and acceptance checkpoints, subordinate to the canonical vision.
- [Website Engine Contract](docs/website-engine-blueprint.md) — focused free website creation, Layout, validation, and publishing rules.
- [Unified Platform Blueprint — historical pointer](docs/unified-platform-blueprint.md) — retained for old links; canonical requirements are in the product vision.
- [Architecture](docs/architecture.md) — system boundaries and technical baseline.
- [LUCIA Core authentication-only boundary](docs/core-auth-only-boundary.md) — Core authenticates; LUCIA OS owns local authorisation and product data.
- [Engineering Standards](docs/engineering-standards.md) and [Security Baseline](docs/security-baseline.md).

Before code changes, read [AGENTS.md](AGENTS.md), the canonical vision, roadmap, architecture/security standards, the relevant focused spec, and the actual code/tests.

## Workspace destinations

- **Home / Overview** — context, activity, and next actions.
- **Website Engine** — free website creation and publishing.
- **Layouts** — genuinely distinct, polished, ready-to-personalise website designs.
- **Loom** — professional discovery and connections with a separate, evidence-based verification process.
- **LUCIA Store** — free and paid technology products, version licences, updates/upgrades, custom domains, and eligible white-label/commercial software.
- **Installed applications** — purchased or free apps surfaced as launchable workspace icons.
- **Settings** — profile, workspace, security, and app preferences.

The workspace must adapt intentionally to mobile (iOS-inspired), desktop (macOS-inspired), and tablet (iPad-inspired) interaction patterns without copying third-party branding or screens. Portals and Business Admin are not v1 products and must not be represented as available.

## Non-negotiable rules

- LUCIA Core / LUCIA ID provides global authentication only. LUCIA OS owns local organisation membership, roles, permissions, tenant data, purchases, and entitlements.
- A valid LUCIA ID is not universal permission; enforce authorisation and tenant scope on the server.
- Standard website creation and publishing remain free; do not make basic website creation depend on subscriptions, paid layouts, or AI.
- Layouts must be genuinely different in structure and design, not just title/copy/colour variations.
- Loom verification, payment status, and user roles are separate concepts. Payment alone cannot buy a verification badge.
- Store's default software model is a one-time purchase of a specific version with the listed update period; do not silently introduce subscription expiry or undisclosed runtime fees.
- White-label/resale rights are product-specific and must be explicitly licensed.
- Failed website save/publish preserves the previous known-good live version. Purchase and version-upgrade operations must be idempotent, auditable, and recoverable.
- No inert controls, fake progress, fabricated data, client-trusted payment state, or success before server confirmation.
- Documentation does not prove implementation. Record actual tests and acceptance evidence.

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

The app should start without production credentials. Features requiring external services must fail safely and explain configuration requirements; do not add fake production data or silently bypass authorisation.

## Delivery discipline

Audit actual code and test evidence before updating status. Work in narrow, reviewable slices. Do not perform destructive migrations, production resets, DNS changes, secret changes, or deployments without explicit approval. Do not merge to `main` until required verification is complete and the user explicitly authorises the merge.
