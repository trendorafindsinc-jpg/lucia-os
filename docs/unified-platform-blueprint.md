# LUCIA OS Unified Platform Blueprint

**Status:** Superseded by the canonical product vision dated 2026-10-26.  
**Canonical specification:** [LUCIA OS Product Vision and Contract](lucia-os-product-vision.md)

The founder's four-section direction in `lucia-os-product-vision.md` is authoritative for product scope, terminology, free website creation, workspace UX, Layouts, Loom verification, LUCIA Store, licensing, upgrades, white-label rights, and delivery order.

This file is retained as a stable link for existing repository references. Its previous navigation and scope details are historical where they conflict with the canonical specification. Do not use this file as an independent source of product requirements.

Technical boundaries that remain in force:
- LUCIA Core / LUCIA ID provides global authentication only; LUCIA OS enforces local membership, permissions, tenancy, and entitlements.
- Tenant isolation is enforced server-side across APIs, rendering, jobs, webhooks, assets, and exports.
- Documentation describes intent, not implementation status. Inspect code and test evidence before claiming completion.
- Failed website publishing preserves the previous known-good live version.
- Purchases and entitlement changes are server-authoritative, idempotent, auditable, and recoverable.
- Do not perform destructive production changes or merge/deploy without the applicable explicit approval.

Read the canonical product vision and the current implementation roadmap before starting work.
