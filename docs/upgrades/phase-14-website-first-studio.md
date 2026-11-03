# Phase 14 Upgrade — Website-First Layout Studio

**Approval:** Founder-approved specification (1 November 2026). **Implementation/acceptance:** pending.  
**Parent:** [Phases 14–16 Studio Upgrade Programme](../phase-14-16-studio-upgrade-programme.md).  
**Retains original Phase 14 duty:** all 48 premium Layouts complete, distinct, functional and individually quality-gated.

## Mission

Replace the *customer's experience of navigating a multi-page software dashboard* with a single, website-centred creative workspace. On opening Layout Studio, the customer sees their **actual sites first**. On opening a site, the **actual website is the editor**. The implementation must extend existing v2 composition, routes and publishing, not construct another renderer.

## The approved flows

### A. Studio entry

- Zero websites → clear empty state + **Create New Website**.
- One website → show that website card, not auto-skip; **Create New Website** still visible.
- Multiple websites → simple responsive cards/list with name, true live/draft status, verified host, authentic thumbnail where available; safe sort/search only if useful. Organization/permission scoping, including membership changes; no cross-tenant peek.
- Selecting an existing site offers **Edit Website / Write Blog / Publish News / Manage Media**. Edit opens in-place website. Other actions remain website-scoped within Studio, delivered by Phase 15; no dead buttons or fake production content.
- Keep a clear path back to the website picker, but no persistent metrics dashboard or unrelated primary navigation.

### B. New website creation (single compact flow)

**No more than five questions**, preferably on one small screen:
1. **Required:** site/business name.
2. **Required:** what business/service/category the customer represents (free text plus helpful choices).
3. **Required:** desired site goal (e.g. explain services, attract customers, show work, inform community).
4. Optional: contact details (can finish later).
5. Optional: preferred style/branding (can finish later).

Do not force account-specific fields already verified by LUCIA ID, extra surveys, payment selection, AI setup or complex custom domain setup. Use sensible auto-generated slug with server-side collision checks; show changeable site address when relevant. Server-authorized create must remain idempotent.

**Recommendation engine (no AI):**
- Use existing canonical Layout registry and candidate metadata; tag business categories, visual styles, content capabilities and appropriate section types **without mutating canonical Layout IDs**.
- Produce an ordered top three with short human-readable reasons, plus **View All 48** with accurate previews/filters. The 48 must remain selectable regardless of ranking.
- Example: barbershop → grooming/local services/lifestyle/service presentation; **not** school admissions or art portfolio first. When no close match exists, show flexible service/business defaults and explain fit honestly.
- Selecting a Layout creates a real **persisted** website and editable v2 composition, then opens the website in Studio. Render preview, draft and published pages from the **same validated definition**. No ephemeral-only site masquerading as created.

### C. Website-first visual editor

- On-page, click/tap-to-edit text including headings and copy; change images/alt text through controlled media picker/upload; modify supported colour/type/logo/contact fields with minimal inline controls.
- Reorder **registered sections** using visible drag handles; also up/down buttons for touch and keyboard. Do not permit arbitrary drag free-positioning that breaks responsive layout; prevent moving required/protected sections where the design contract forbids it.
- Contextual **Add Section** restricted to the relevant registered section types and page schema. Reuse existing section architecture and rendered layout-specific compositions, not a common generic skeleton for every Layout.
- Compact toolbar: site/page switcher, Undo, Redo, Saved state, Preview, **Publish**, Advanced Mode; secondary drawers open without losing the site preview. Ensure correct state after reload, route back/forward and cross-tab/account changes.
- Autosave is debounced, authorized, revision/ETag-aware, and retries safely; explicit states for local dirty, syncing, acknowledged, offline/conflict/error. Never claim the server has saved unsent edits. Publish only an accepted saved revision; failed publish must retain prior live site.
- Undo/Redo works for relevant local edit operations; durable historical restore retains the v2 snapshot plus references, not a local screenshot. Expose intentional version creation and restore for server revisions.
- Preserve existing publishing address, custom-domain rules, v1 data and revisions; built-in Layouts and free publication work when optional IDrive upload is unavailable.
- Avoid compulsory chat-like questions to perform direct manipulation; **Craft Guide** may offer optional deterministic help, labelled non-AI.

### D. Responsive/accessibility/low-bandwidth

Support 320/390/768/1180/1440px and actual phone touch, keyboard/screen reader, reduced motion, focus preservation, accessible labels, fast previews and sensible image size/caching. Never hide Publish or undo behind a desktop-only hover. Network outages have clear status, a recovery plan and no false success. Any local queue requires explicit unsynced state and safe conflict handling.

## Engineering touchpoints (audit before modifying)

- \`src/app/workspace/websites/page.tsx\`: current site list plus complex nav/actions.
- \`src/components/onboarding/website-setup-wizard.tsx\`: current multi-step setup.
- \`src/lib/templates/starting-layouts.ts\` and \`src/lib/layout-blueprint/premium-layouts/*\`: the canonical Layout candidate/metadata adapter.
- \`src/components/layout-studio/*\`, current Composition Studio, \`src/app/editor\`, creation and draft/revision/publication APIs.
- \`docs/layouts-48-premium-catalogue.md\`, \`docs/phase-14-premium-layout-decisions.md\`, \`docs/phase-15-layout-previews-selection.md\`: existing fidelity, per-Layout scoring, preview and identity contracts.

Deliver an explicit **current UX → simplified UX route map**, preserving old deep links through forwarding/compatibility paths. Roll out on a representative flagship (e.g. Meridian), then prove on all 48 real designs. Historical flagship evidence is a baseline, not automatic acceptance for new UI.

## Acceptance checklist (real tests, not screenshots alone)

- [ ] Zero, one and many websites are correctly shown; only authorized sites appear; real card action works; no repeated setup for existing site.
- [ ] ≤5 prompts; exactly three required; user can skip optional values; correct rule-based top three and all-48 catalogue; realistic service-business test and fallback.
- [ ] For all 48, verified distinct designs and usable interior pages, real preview/selection/persisted creation/edit/reload/public rendering; preserve original 8×6 catalogue and previously approved visual rubric.
- [ ] Tap text edits actual page; replace allowed image; reorder; add supported section; keyboard equivalent; no missing save/preview/publish; 320→1440px.
- [ ] Autosave reflects actual server confirmation; concurrency conflict, refresh, offline, failed save, undo/redo and historical restore work without overwriting or fabricating success.
- [ ] Two unrelated tenants are denied reads/edits of each other's sites; successful authorised publish results on the correct domain; no OS route leaked to customer domains.
- [ ] Five untrained users with prepared material can attempt a real website and publish target ~5 minutes; measure completion, route changes and confusion, then fix significant blockers.
- [ ] Green targeted tests, exact-head required CI, authenticated real application/browser acceptance and founder visual/usability approval.

## Completion and handoff

**Phase 14 Upgrade DONE** requires a beginner-friendly genuine end-to-end flow **and** accepted 48-Layout functional fidelity. Not done merely because a new landing/picker/editor exists. Phase 15 builds content inside the same site's context, never another mandatory dashboard.
