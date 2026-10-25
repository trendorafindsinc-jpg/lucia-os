# Codex / AI Agent Operating Instructions

Before changing code in this repository, read these files in order:

1. `docs/unified-platform-blueprint.md`
2. `docs/implementation-roadmap-30-phases.md`
3. `docs/architecture.md`
4. `docs/engineering-standards.md`
5. `docs/security-baseline.md`
6. The phase-specific document named by the roadmap.
7. The relevant code, tests, migrations, and current Git status.

## Required working method

- The roadmap is the canonical phase order. Do one phase at a time.
- First audit actual code and test evidence; never infer implementation completion from documentation, a PR title, or a successful build alone.
- Before implementation, provide a concise baseline, the exact phase, the gaps, the files/areas likely to change, and the acceptance checks.
- Keep changes narrowly scoped. Do not refactor unrelated systems or silently pull future-phase work into the current phase.
- Every visible UI control must have real behaviour wired from UI event through server/API validation to persisted result and updated UI. Do not “fix” a dead button merely by changing environment variables or unrelated configuration.
- Do not fake progress, success, data, metrics, or provider outcomes.
- Test negative cases, tenant isolation, permission denial, retries, partial failure and recovery—not only the happy path.
- Record actual commands/checks and outcomes. If a test was not run, say so.
- Update the roadmap/progress checkpoint only from verified evidence.
- Keep the existing working customer sites, data and live versions safe.
- LUCIA Core is global authentication only. LUCIA OS owns local organisation membership, permissions, content, billing, subscriptions and entitlements.
- Enforce authorization and tenant scope on the server for APIs, server actions, assets, rendering, jobs, webhooks and exports. Never trust client-selected tenant IDs or hostnames.
- Premium access, user roles, and Loom business verification are separate concepts.
- Website templates, AI-generated content and user-supplied Blueprint data are untrusted; validate against supported schemas and components. Never execute arbitrary generated code.
- Payment state is server-verified and idempotent. A browser redirect is not proof of payment.
- Preserve the previous known-good live website on save/publish failure.
- Do not perform destructive migrations, production database resets, DNS changes, secret changes, production deployments, or live-domain operations without explicit user approval for that specific action.
- Do not merge to `main` without complete phase verification and explicit merge approval.
- Do not claim code was changed, tests passed, or deployment/merge succeeded unless the available tool results prove it.

## Product navigation decisions

The approved first-class LUCIA OS destinations are Overview, Websites, AI Studio, Store, Portals, Business Admin, Loom, and Plan & Billing. Supporting tools (Layouts, Domains, Publishing) may be contextual within Websites if that is clearer. Loom is a standalone community destination, not a subsection of Business Admin, Store, or Portals.

- **Store:** tailored to sellers and buyers.
- **Portals:** tailored to the requirements and workflows of each approved category.
- **Business Admin:** tailored to companies managing day-to-day activities.
- **Loom:** community, business discovery, discussions, groups, connections, messaging, collaboration and trust/safety.
- **LUCIA ID/Core:** authentication only.
- **loomifyAI:** optional AI creation assistant.
- **Layer Studio:** website editing/creation workspace.
- **Layouts:** discover reusable website compositions.

## End-of-session report

Always report:
1. Phase and status.
2. Files changed.
3. Tests/checks run and outcomes.
4. Acceptance evidence and remaining gaps.
5. Risks or blocked decisions.
6. Next smallest safe action.
7. Whether a merge/deploy happened (normally no unless explicitly approved).
