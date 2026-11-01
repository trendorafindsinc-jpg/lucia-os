# LUCIA OS — Phases 14–16: Website-First Studio Upgrade Programme

**Decision authority:** Founder, approved 1 November 2026  
**Programme status:** Product/architecture specification APPROVED; **implementation and release acceptance NOT APPROVED**  
**Repository:** \`trendorafindsinc-jpg/lucia-os\` | **Base:** existing \`main\` architecture  
**Scope:** Three consecutive upgrades to existing Phases **14 → 15 → 16**, not new numbered roadmap phases.  
**Execution briefs:** \`docs/upgrades/phase-14-website-first-studio.md\`, \`phase-15-content-and-media.md\`, \`phase-16-advanced-code-studio.md\`.

> **Mission:** A customer opens Layout Studio to create or manage a website, not to learn a software dashboard. **Simple by default. Powerful when needed. Beautiful throughout.**

## 1. Authority, precedence and completion semantics

This programme is the current founder-approved **UX, integration and re-acceptance contract** for Phases 14, 15 and 16. Read alongside \`docs/implementation-roadmap-30-phases.md\`, \`docs/layouts-48-premium-catalogue.md\`, \`docs/phase-13-premium-layout-composition-engine.md\`, \`docs/website-engine-blueprint.md\`, \`docs/shared-object-storage-architecture.md\` and the existing phase implementation notes. If earlier phase descriptions prescribe complicated customer navigation or claim a prior UI is final, this newer approved customer journey takes precedence **for these upgrades**. It does not erase or relax previous feature, security or accessibility requirements.

- **Phase 14 originally:** all 48 genuinely distinct, complete premium Layouts and their functional quality gates. **Upgrade:** expose them through a frictionless, website-first Studio and prove the full experience on all 48. Do not relabel 48 candidate IDs or screenshots as 48 accepted functional designs.
- **Phase 15 originally:** authentic previews, selection and durable website creation. **Upgrade:** retain those obligations and add a genuinely integrated Blog/News/Media authoring and publishing experience, as approved by the founder.
- **Phase 16 originally:** content personalization and durable customer media. **Upgrade:** retain those obligations, close unfinished live-storage/revision acceptance, add isolated Advanced Code Studio and perform integrated approval of all three upgrades.
- Past merges, green CI, preview readiness and implementation documentation **are not founder approval** of a phase. The founder has explicitly withheld final approval of **14, 15 and 16** pending delivery of this programme. Do not rewrite historical PR results; label old evidence historical and distinguish from new acceptance.
- **No rebuild:** preserve LUCIA Core as sole identity authority; existing organizations/memberships/RLS; 48 canonical \`lucia.layout.*\` identities; validated v2 composition and publication renderer; v1/legacy compatibility; domains/routing; original designs and assets; existing website data, drafts, published versions, audit/history and media ownership. No second auth, CMS vendor, renderer or storage provider.
- This document **authorizes specification**, not an automatic implementation, production migration, live storage activation, cloud spend, credentials, merge or release. Execute changes through reviewed implementation PRs and explicit release authorization. 

## 2. Non-negotiable customer experience

### 2.1 Open Layout Studio

The entry screen displays **the customer's actual saved website cards**, whether zero, one or many, and one clear **Create New Website** control. Minimal chrome; no mandatory metrics dashboard, persistent complex sidebar or separate \`/templates\` → \`/create\` → \`/editor\` → \`/publish\` maze. Cards show a useful preview, name, domain/status and direct action; scoped to authorized organization(s).

- **New:** Create New Website → maximum **five questions total** (only three mandatory: business/site name, what the business does or category, main website goal; at most two optional: contact details and preferred style/branding) → rule-based ranking of **three** suitable actual Layouts, with **View All 48** → preview/select → create a persisted website/draft **once** → open that real website in the visual editor immediately. A barbershop should receive service/local-business matches before irrelevant school/portfolio Layouts. Use catalog metadata, supported section patterns, search, tags and deterministic rules, not an AI API or unbounded guesswork. Good fallback recommendations when no exact business match. Avoid fake personalized content and unwarranted industry claims.
- **Existing:** Select website → concise within-Studio actions: **Edit Website**, **Write Blog**, **Publish News**, **Manage Media**. Edit displays the **actual saved website**, not a form dashboard. No repeated onboarding or forced Layout reselection. Projects with older blueprint versions must continue to open or show safe compatibility/recovery options.
- **Visual editing:** tap/click text and edit in context; tap image to replace; move entire registered sections by drag handles **and keyboard/mobile Move up/Move down** controls; add supported sections with contextual plus controls; use compact inspector/drawer only when needed. Show live unsaved preview and real server-save status. Preserve design constraints, accessible content and valid responsive composition.
- **Visual toolbar:** website/page selection, undo, redo, save/recovery status, Preview, **Publish**, Advanced Mode. Tasks should happen inside Studio drawers/panels, with a consistent **Return to website** action when a secondary route is truly required.
- **Mobile first:** 320/390/768/1180/1440px; touch targets, no hidden required actions, accessible keyboard/screen-reader/reduced-motion paths; usable on constrained mobile data and interrupted connectivity.
- **Guided Craft conversation:** optional assistive rule-based prompts, **not** required, not represented as AI. No compulsory chatbot exchange merely to change visible content.
- **Terminology:** **Layouts** (not templates), **Publish** for Visual Mode; **Deploy** for Advanced Code Mode. Both publish only a validated immutable release through approved ownership/routing controls.

### 2.2 Recovery and truthful state

Use durable drafts with debounced server-confirmed autosave and explicit **Saving / Saved / Offline / Conflict / Failed** statuses. **Never claim saved before server acknowledgment.** Provide Undo/Redo and recoverable revision history with clear local-versus-server distinction, concurrency/If-Match protection, retries that do not duplicate project creation, safe recovery after reload or account change and actionable conflict resolution. If an offline editing queue is offered, it must be bounded, protect data, avoid silent overwrite and label unsynced changes. Failed publish/deploy must leave prior live version untouched.

### 2.3 Content without navigational complexity

Blog/News/Media flows open in the **same website context**. A publishable article must appear on the actual website: article route, listing, optional featured position, SEO/meta, author, timestamps and navigation appropriate to Layout. Adding posts must not require manually making a new page each time. Changing the Layout must not delete or detach content. Advanced Code Mode provides a documented safe content integration interface; do not inject raw SQL, private API tokens or privileged CMS access into customer code.

### 2.4 Advanced freedom

A clearly visible **Advanced Mode** control opens **LUCIA Code Studio**, a source editor with file tree, preview, build diagnostics, deployment history, rollback and prominent **Deploy** action. Customers can copy/export/edit/paste/import their **website-specific source artifact**, including an intentionally blank replacement. Offer a copyable **external AI prompt plus import contract**, without requiring or silently calling any AI model. The UI must make clear the difference between exported website HTML/CSS/approved JS and LUCIA's private Next.js/server source.

- Visual composition and arbitrary code **cannot be assumed round-trip compatible**. Entering Code Mode preserves a recoverable visual snapshot; returning to Visual Mode requires restoring that structured version or an explicit validated supported import, not silently destroying advanced changes.
- A failed source validation, build, preview or deploy **never mutates** the last-known-good public release. Rollback restores the correct immutable artifact, referenced media and routing pointers; does **not** pretend to reverse external transactions/form submissions or unversioned database mutations.
- There must be a real, not simulated, build log. Pure static HTML/CSS need no fake install step. Supported compiled projects use an isolated build environment; no runtime dependency installation on shared LUCIA production hosts.

## 3. Approved platform architecture (one platform, no second vendor stack)

| Concern | Authoritative component | Contract |
| --- | --- | --- |
| Identity, memberships, roles | LUCIA Core + existing OS access layer | One identity authority, authorization on each action, least privilege, tenant RLS |
| Structured sites/48 Layouts | Existing validated v2 blueprint, section registry, renderer | Retain \`lucia.layout.*\` IDs, actual page structure, drafts and publish pipeline |
| Site/editor navigation | Existing OS Studio routes/components, unified experience | No parallel frontend/editor/renderer; migrate or wrap obsolete routes safely |
| Site/article/deployment metadata | Existing PostgreSQL/Drizzle and narrowly required normalized tables | Durable site ownership, revisions, posts, categories, schedules, audits |
| Images/videos/documents/source artifacts | Existing **LUCIA OS private IDrive e2 bucket** via provider-neutral storage boundary | Server-owned keys, tenant scoping, quotas, reference retention; no second storage provider |
| Static advanced previews/builds | Separate-origin preview and isolated build/validation executor | Customer code never runs as privileged OS code |
| Public website delivery | Existing tenant/custom-domain router/publishing authority | Atomic immutable release selection; host/domain ownership; no leak across tenants |

**Storage reality at 1 November 2026:** \`src/lib/media/storage.ts\` validates keys shaped as \`os/{org}/{site}/{id}.webp\`, sets \`image/webp\`, bounds reads to 260,000 bytes; \`src/lib/media/image.ts\` accepts JPEG/PNG/WebP originals and compresses to WebP. **These methods do not already support video/audio/document/source uploads.** Extend/generalize safely with distinct bounded object categories, MIME sniffing, streaming/multipart methods, checksums, purpose-scoped credentials, lifecycle and quota rules. Do **not** weaken existing image guarantees. Never route large video bodies through a size-limited serverless request; securely authorize direct-to-object-storage uploads with restricted short-lived permissions and verified completion, including an approved CORS policy.

Reuse server-only \`S3_ENDPOINT\`, \`S3_REGION\`, \`S3_BUCKET\`, \`S3_ACCESS_KEY_ID\`, \`S3_SECRET_ACCESS_KEY\` **if correctly and securely provisioned** for LUCIA OS. No second provider or duplicated per-feature credential family is planned; **do not claim no configuration work is required**: verify restricted bucket credentials, correct environment scopes, bucket CORS for direct uploads, storage limits, costs and smoke tests. Build-sandbox credentials may be separately needed if an external execution provider is later approved. Keep built-in Layouts and free standard publishing functional when optional customer-media upload is unavailable.

**Current content baseline:** \`website_content_libraries\` and \`/api/websites/[websiteId]/content-library\` store a validated JSON library and draft/status labels; \`/content\` still contains prototype wording, and setting a \`published\` label does **not** implement public article delivery. Build real normalized article data and publication machinery, with a safe migration/import for legacy JSON drafts; no silent overwrites.

**Open historic Phase 16 storage gates:** \`docs/phase-16-live-storage-acceptance.md\` identifies real v2 historical composition rollback and independent proof of bucket-scoped key denial as blockers. Reassess against current code, close each with authorized evidence, and **fail closed** on any remaining gap. A historic merged PR is not proof these live requirements passed.

## 4. Three cumulative engineering upgrades

| Phase | Mandatory responsibility | Final phase-specific gate |
| --- | --- | --- |
| **14 — Website-First Studio** | Website picker; create and resume; ≤5-question onboarding; top-three ranked Layouts / all-48 browser; real Layout previews; direct on-page text/image/section editing; autosave; undo/redo; inline preview/publish; preserve all 48 actual designs | A beginner with content prepared creates, edits and publishes a functioning website without understanding the dashboard; all 48 pass applicable rendered/edited flows |
| **15 — Blog, News & Media** | One post engine with Blog/News user flows; normalized tenant-scoped data; create/edit/preview/real publish/unpublish/schedule; article listing/routing/SEO; safe content-on-Layout contract; integrated authorized media library with IDrive image/video/document upload policies | An existing customer publishes a blog, news item and supported media and sees them on live correct domain after reload, with cross-tenant denial |
| **16 — Advanced Code + Integrated Acceptance** | Real source editor and import/export; code ↔ visual-mode recovery; statically safe and isolated compiled build tracks; security protocol; genuine logs/errors; preview/Deploy/atomic rollback; storage production-safety evidence; release and full journey audits | An advanced customer replaces all source and deploys an approved artifact; bad code is rejected, old site retained, restore works; **Phases 14–16 jointly pass** |

See the individual implementation briefs for work breakdown, security, migrations, integration contracts and acceptance cases. Do not defer Phase 14's 48-Layout functional quality to a later phase or substitute preview screenshots for usable sites.

## 5. Universal security and abuse protocol

1. **Source ≠ permission to execute.** Uploaded/pasted code is untrusted, including code from ChatGPT or other AI. No user-specific JavaScript or dependency install executes with LUCIA OS production privileges, production session cookies, secrets, network identity or database access.
2. **Separate origin and browser isolation:** preview and publicly deployed custom code must not share the privileged OS/LUCIA ID origin. Use host-only auth cookies, tight CORS/CSP, permission isolation, sandboxed preview where applicable and verified tenant-host routing. Do not treat an iframe alone as a full security boundary.
3. **Build isolation:** ephemeral filesystem/VM/container with resource/time/output limits, no cloud metadata/private-network reachability, no secrets, constrained outbound network and approved dependency rules; enforce per-tenant build concurrency/rate limits and log sanitization. Evaluate cost before selecting Vercel Sandbox or another executor. No customer-created per-site Vercel project by default.
4. **Supply chain:** inspect archive paths, traversal/symlinks, file type/size/count and import manifest; prohibit server routes, credential access, native plugins, arbitrary build hooks or unsupported packages in static track. Compiled track needs an explicitly supported framework/runtime, lockfile, controlled installs and executable sandbox. Reject unclear/unsupported workloads rather than fake success.
5. **Deployment:** immutable manifest and hashed assets, server authorization at every transition, validated domain binding, malware/abuse controls, approved outbound APIs, CSP as feasible, no OS privileged endpoint calls, no unauthorized dynamic backend. Clearly communicate that static custom JS can still affect visitors and warrants scrutiny.
6. **Storage/content:** per-site and account budgets, MIME/content verification, malware screening where relevant, reference checks before deletion, backups/retention, GDPR/privacy considerations, audit trails, no public access to drafts, anti-XSS/sanitization of user-generated articles and safe embedded media; tenant isolation on read/write/publish/unpublish/restore.
7. **Protect production:** prior live version survives every failed validation, install, build, upload, publish or deploy. Rollback must be exercised against persisted v2 composition and custom artifacts; not mocked.

## 6. Migration, compatibility and delivery rules

- Audit existing routes/components and data before changing code. Adapt current \`/workspace/websites\`, \`/create\`, \`/templates\`, \`/editor\`, \`/publish\`, \`/content\`, \`/api/websites/*\`, v1 editor and v2 Studio without breaking deep links. Use redirects or compatible entry points only where authorized and tested.
- Preserve organization boundaries, all existing websites/domains/URLs, canonical Layout IDs, source and media references, drafts/revisions and published snapshots. Migrate only with reversible, idempotent steps; backfill and migration validation before deprecating legacy content-library fields. Do not wipe customer posts because a Layout is changed.
- Existing forms and analytics prototypes are not automatically productionized by this programme; do not misrepresent them as live. This work must not regress them, core OAuth, domain routing, Store or other OS workspaces.
- Prefer focused implementation PRs with code/tests/docs, controlled rollout and feature flags. Minimize repeated GitHub Actions runs: targeted local verification before required exact-head CI. No infrastructure/secret changes without necessary owner action and audit.
- Do not alter pricing: standard website creation, built-in Layout editing, preview and supported LUCIA-domain publication remain free under existing contract. Advanced execution limits/operating costs require separate commercial approval; do not invent charges.

## 7. Evidence and release acceptance

**No phase is accepted from a document or green CI alone.** Produce an evidence matrix with actual commit, environment, test steps, results, screenshots/recordings from real browser sessions, DB/storage state and outstanding limitations.

Required cross-phase tests:
- Zero/one/many websites; authorized organizations; new-site creation idempotency and no more than five questions; correct barbershop-like recommendation and usable fallback; preview/select/create/edit/publish with real saved identity.
- All **48** canonical Layouts: unique real page/section compositions, visual review and all applicable create/replace/save/reload/public-render scenarios, including interior pages and responsive/accessibility checks. Respect previously approved per-Layout scoring rubric and no false count inflation.
- Actual touch, pointer, keyboard, reorder, images, focus, screen reader, reduced motion, 320/390/768/1180/1440px; invalid network and interrupted offline/save/revision conflict; server-confirmed autosave; Undo/Redo and persisted restore.
- Two unrelated tenant identities with least-privilege Postgres/RLS through **real HTTP**: cannot list/read/alter/upload/publish/restore another site's drafts, posts, versions or media; confirm real LUCIA ID OAuth separately from synthetic sessions.
- Posts and News: draft→preview→publish→public routes, listing/category/SEO, updated and scheduled dates, unpublish and subsequent Layout replacement; migration of old content library drafts; safe media references.
- Real restricted IDrive upload/get/reload/public publish/unpublish/revision rollback/quota and object deletion lifecycle; image, supported video and document cases; approved credential-scope proof with safe canary or administrative policy verification; cleanup evidence.
- Advanced export→external edit→paste/import→validate→preview→Deploy; empty-source site; source rollback; retain visual original; failed syntax/package/build/security/dependency/oversized uploads preserve previous live; actual output logs with secret redaction; cross-tenant/domain/source isolation.
- Accessibility, performance/low bandwidth, origin separation, hostile browser script, SSRF, archive traversal, dependency supply chain, DoS quotas, cache leaks, response headers; production smoke test at the exact deployed commit.

**Usability target:** with prepared content and a suitable Layout, target a working first publication within approximately **five minutes**; measure median time, number of route changes, completion without instruction and where five first-time users hesitate. It is a product target, not a guaranteed time for every website. No forced off-Studio navigation for standard edits.

**Release policy:** only mark Phases 14, 15 and 16 complete after their independent gates **and** the integrated final gate pass with genuine proof. Flag partial work honestly. PR merges or deployment status never substitute for founder acceptance.

## 8. Developer handoff / requested implementation order

1. Baseline audit and gap matrix across current \`main\`, existing PRs/migrations/test evidence; report actual readiness, not assumed completion.
2. Implement Phase 14 as a vertical real user journey first on one existing Layout, then scale to all 48 while preserving prior functional/layout quality gates.
3. Implement Phase 15 as a real live content vertical slice (post + upload + public delivery) and then add News, scheduling and media variety; no new CMS vendor.
4. Implement Phase 16 with safe static Code Mode first, then explicitly approved compiled-project sandbox, plus storage/history security closure. Source editor alone is not completion.
5. Run one integrated browser/security/release audit against the exact candidate head, capture failures/fixes, obtain explicit founder release decision.

**The developer's definition of done is the customer's finished, secure, recoverable experience—not the number of pages, controls, database tables or tests created.**
