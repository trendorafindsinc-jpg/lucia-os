# LUCIA OS

LUCIA OS is a multi-tenant platform for building and operating websites and, over time, optional specialist portals for organisations. Version 0.1 focuses on the Universal Website Engine. One application deployment serves many organisations; customer-specific deployments are not part of the design.

## Status

**Phase 1 — Architecture and project foundation.** This repository is being established from an empty starting point. The current phase defines architecture, standards, environment boundaries, and the initial application scaffold. Features must not be described as production-ready until implemented and tested.

## Product principles

- One LUCIA ID can belong to multiple organisations.
- Every organisation has an isolated workspace, members, roles, content, domains, and entitlements.
- Website Portal is the first deliverable. Future portals are modular and separately entitled.
- LUCIA Secure/Core is the identity authority; LUCIA OS owns website content and its subscription, invoice, and entitlement records.
- Subdomains are routing identifiers, never authorization credentials.
- Free website publishing on a LUCIA subdomain remains useful; custom domains and operational Store Portal features are premium.
- No fake controls, client-trusted permissions, or cross-tenant data access.
- Main-branch changes require validation; each phase has acceptance criteria before work advances.

## Technology baseline

- Next.js App Router + TypeScript
- Neon PostgreSQL + Drizzle ORM
- Vitest for unit/integration tests; browser-level tests introduced with product flows
- Vercel for application hosting
- S3-compatible object storage behind an adapter
- Provider adapters for payments and other external services

See [Architecture](docs/architecture.md), [Engineering Standards](docs/engineering-standards.md), [Security Baseline](docs/security-baseline.md), and [Environment Setup](docs/environment-setup.md).

## Local development

Prerequisites: Node.js LTS and npm.

```sh
npm install
cp .env.example .env.local
npm run dev
```

The app should start without production credentials. Features that need external services must fail safely and explain configuration requirements; do not add fake production data or silently bypass authorization.

## Phase acceptance

Phase 1 is accepted only after the project scaffold, architecture/security/environment documentation, lint/type-check/build commands, and a repeatable validation workflow are present and verified. No production deployment or live database mutation is included in Phase 1.
