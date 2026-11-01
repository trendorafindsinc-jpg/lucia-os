# Phase 16 Upgrade — Advanced Code Studio and Integrated Release Acceptance

**Approval:** Founder-approved specification (1 November 2026). **Implementation/acceptance:** pending.  
**Parent:** [Phases 14–16 Studio Upgrade Programme](../phase-14-16-studio-upgrade-programme.md).  
**Retains original Phase 16 obligations:** personalize all 48 supported Layouts, preserve drafts/published versions and close real IDrive media storage and historical rollback gates.

## Mission

Advanced customers should find a **visible Advanced Mode** action inside their website-first Layout Studio. Opening it shows real, editable **website source**, a file tree and a Vercel-inspired but independently implemented toolset: **Preview / Build Logs / Deployments / Rollback / Deploy**. They may copy all website source to ChatGPT or another tool, replace entire code with a blank design, paste/import the new code and genuinely deploy it, subject to a strict, understandable security protocol.

**No AI service is required or automatically called.** Imported external AI code is untrusted. Do not introduce one Vercel project per customer site, a second renderer for structured Layouts, another CMS or a new LUCIA identity authority.

## The exact customer journey

1. Within a selected website, choose **Advanced Mode** (visible but secondary to Visual Edit). Warn only when appropriate about structured visual compatibility; preserve the original durable version.
2. See the site's **exportable code artifact**, not the proprietary Next.js server, database schema, OS environment variables or unrelated tenant data. Project/file explorer shows meaningful HTML/CSS/approved JS/assets and version/source metadata.
3. Click source to edit; support syntax highlighting, line numbers, search, formatting, key navigation, paste, file-level changes, replace-all and an intentional empty site. Monaco or an equivalent proven editor is a sensible implementation choice, but do not require a heavyweight editor payload for simple mobile tasks.
4. Provide **Copy source**, **Download/Export**, **Import/Paste** and **Get a prompt for external AI**. The prompt requests an agreed LUCIA code-import manifest, permitted language/asset types, responsive/accessibility requirements and no server secrets/privileged endpoints. Show the exact import contract, not unverifiable claims of compatibility.
5. **Preview** builds an isolated, private candidate. Each candidate displays source revision, validation/build status and whether the preview differs from live.
6. **Deploy** creates an immutable approved release and atomically promotes it for the same website's validated domain(s). In normal Visual Mode this action is named **Publish**; back-end controls are shared.
7. See actual build logs and history. **Rollback** restores an earlier retained immutable release (code/visual + referenced assets) after authorized confirmation, without purporting to undo external data.
8. **Return to Visual Mode** restores the saved structured design or uses an explicitly supported conversion; arbitrary code does not silently become registered draggable sections. Keep both original structured snapshot and code history, with clear choice of current live release.

## Two explicit execution tracks (avoid pretending all code is safe to run)

### Track A — Approved static website code (must ship first)

- Full replaceable \`index.html\`, CSS, approved client-side JS and safe public assets under a bounded manifest; customers may clear everything and deploy a blank static document with accessible fallback.
- Validate syntax, permitted file types/extensions, MIME/content, paths, links/embeds, disallowed privileged endpoints and references. Content sanitization alone is **not** sufficient to isolate JavaScript; use separate-origin hosting, strict cookie scope and a robust security policy.
- Publish built, immutable static artifacts through the authorized website delivery interface; no package installation required and no fake install logs.
- Approved assets and content APIs must be explicitly versioned and tenant/website-scoped. Do not allow untrusted code to read protected drafts, edit LUCIA Core accounts or call privileged OS endpoints.
- The preview must be on a non-privileged origin with no OS authentication cookies; customer-specific runtime must likewise not inherit OS privileged session cookies.

### Track B — Compiled source projects (optional only after sandbox passes)

If the founder wants dependency installs, framework source or build scripts, support **explicitly approved frameworks and reproducible build toolchains** (not arbitrary unrestricted server execution):
- Entrypoint/manifest, bounded file count/size, allowlisted runtime/toolchain, lockfile and pinned dependencies; fail on unsupported native modules, privileged server routes or hazardous install hooks according to defined policy.
- Ephemeral isolated build executor (independent from LUCIA OS server/production network). No access to IDrive credentials, LUCIA ID, PostgreSQL URLs, Vercel production tokens, metadata endpoints or other tenants. Bound CPU, RAM, storage, duration, output bytes, network egress and concurrent jobs per site; restrict SSRF/DNS rebinding/network reachability. Never run \`npm install\` or customer build hooks inside the shared Next.js instance.
- Only approved static/site artifacts are publishable initially. Server-side runtimes, arbitrary background workers, user-hosted databases and dynamic dependencies require separate hosting/security/economic approval; do not pretend framework SSR works when only static output is supported.
- Evaluate Vercel Sandbox or a comparable isolation executor on capability, costs and threat model. Vercel **inspired UI** does not imply that every customer gets a Vercel deployment or that Vercel Sandbox is already installed or approved.

## Standard Protocol — LUCIA Code Deployment Contract v1

Version the contract; validate at **import, preview, build and deployment**; log a stable violation code, path/line where available and a fix suggestion. Never rely on a single malware scanner as sufficient proof.

| Area | Accept (bounded) | Reject / stop |
| --- | --- | --- |
| Static source | HTML, CSS, selected safe JS, allowed local assets, valid manifest | Invalid syntax, traversal, ambiguous path, executable uploads, unsupported file kind |
| Rendering | Tenant-specific isolated origin, static output, safe links/media and known content API | Serving customer-supplied JS on privileged OS/LUCIA ID origin |
| Dependencies | Supported build toolchain and locked reviewed dependencies inside isolated executor | Unrestricted \`postinstall\`, arbitrary native binaries, secret-requiring or unsupported runtime |
| Networking | Essential explicitly permitted build fetches, restricted visitor APIs, controlled CORS | Internal networks, instance metadata, admin/tenant/credential endpoints, SSRF, exfiltration behaviours detected by applicable policy |
| Storage | Website-owned media/source/artifacts, quotas, checksums, verified references | Other-tenant keys, public unapproved draft, unbounded or unsupported upload |
| Publishing | Authenticated site owner/editor with deploy permission, immutable validated artifact and atomic live pointer | Direct DB/runtime mutation, guessed tenant IDs, custom-domain spoofing, success before live routing verified |
| Recovery | Immutable release history, assets retained for rollback, audit and safe cleanup | Destructive live overwrite with no recoverable version |

**Security limitations:** Some script risks cannot be perfectly detected statically. A platform must enforce browser-origin isolation, permissions, user warnings and abuse investigation in addition to code scanning; unsupported code must be rejected. Customer code must never be given access to platform environment variables by design. New domain routing must not leak OS host-only cookies through shared \`.lucia.name.ng\` scope. Use least-privilege keys and verify cookies remain host-only across tenant subdomains.

**Build log quality:** Actual states \`queued → validating → building (if needed) → preview ready → deployed\`, with terminal \`failed / cancelled\`. Emit structured sanitized logs; clear filename/line and rule violations, no credentials, internal paths or sensitive tenant metadata. Reject an unsupported package with a real reason; do not add fake compilation/install status. Build jobs are idempotent, cancellable and rate-limited; persist auditable results.

## Source, visual versions and deployment model

**One website identity, two authoring formats, one deployment authority.**

- The existing v2 composition and registered renderer remain authoritative for Visual Mode and the original 48 Layouts.
- The exported source artifact is a deterministic, versioned snapshot of the site's distributable representation and supported content/media interfaces; do **not** expose or mutate LUCIA's actual Next.js application source. Export fidelity must be tested against original render. The exporter may require narrowly scoped development but must reuse the canonical layout compiler/renderer contract rather than building a competing visual site engine.
- A separate code-source/manifest model records authoring provenance, file hashes, dependency lockfile (when supported), owner, organization, site, validation result and content contract version. The source itself may be retained as versioned private IDrive artifacts; metadata and deployment pointers in PostgreSQL. Apply consistent tenant RLS and audit.
- For each website, store immutable release IDs and live pointer: visual release references validated composition snapshot; code release references validated built artifact; both reference the same domain ownership and website metadata. Atomic pointer swap + cache invalidation + verification is the promotion action. A failure before the swap cannot alter the last-known-good release.
- Rollback is **not** editing the old release in place: authorize and promote a retained good revision, retain audit, make files/media reachable, test rollback through actual public hostname. Define retention and GC so referenced media/source/artifacts cannot be deleted while needed by live release, draft, history or rollback policy.
- Blog and News persist independently as Phase 15 data, not woven permanently into static Layout source. **The Code Mode content contract is required** to opt into dynamic public listings/article routes or approved build-time hydration; if code ignores it, display a clear notice rather than falsely promising blog integration.
- Restore on return to Visual Mode must show source of truth, last visual snapshot and current live version; no silent coercion of arbitrary source back into registered JSON.

## Real acceptance tests and production gates

### Normal and advanced site lifecycle
- [ ] Actual website cards and site entry from Phase 14 connect to Advanced Mode for an authorized user; users without edit/deploy rights are blocked server-side.
- [ ] Open **genuine** exportable site source, copy/export/import, paste externally edited code, save, reload and see exact source; no embedded OS secrets or backend code.
- [ ] Completely empty source renders a blank safe static site intentionally; preview→Deploy works; previous live website and visual state are recoverable.
- [ ] A valid updated static project yields actual preview and deploy at the correct website host; logs match actual validation and storage operations, no dummy install.
- [ ] Unsupported framework/dependency and malformed HTML/JS report precise non-sensitive build failures, preserve prior live, do not consume excessive quota; compiled track either genuinely passes isolation tests or is clearly unavailable.
- [ ] Editor undo/redo, version history, source revisions, mobile source-edit fallback, keyboard accessibility, live/preview diff labels, race/concurrency/idempotency, cancel and retry behave correctly.
- [ ] Deploy revision A→B, rollback to A, then forward to B with correct published artifact/media; publication metadata/audit correct, no transaction rollback promised.
- [ ] Return from Code to Visual Mode preserves/restores a prior registered v2 Layout; no loss of posts, SEO, site domain or customers.

### Security isolation and resilience
- [ ] Malicious JavaScript from customer A cannot access LUCIA ID/OS privileged tokens, customer B session/records, private drafts or platform API; browser origin and cookie/CSP/CORS are tested in real browser.
- [ ] Cross-tenant upload, preview, deployment, artifact fetch, rollback, logs, public-domain routing and abuse of site IDs denied with actual least-privilege RLS and server checks.
- [ ] Traversal, symlinks/archive bombs, unsupported MIME, oversized files, insecure embedded URLs, secrets in source, SSRF/private network/metadata, dependency install hooks, malware indicators, resource exhaustion and build job flooding rejected or contained with proof.
- [ ] Build/run isolated from OS production, no secrets or privileged networks; real logs redacted; failed build/upload/provider downtime cannot affect live last-known-good site.
- [ ] Public custom domain & LUCIA-provided domain deliver only active approved artifact, no private preview origin or cross-tenant cache leaks.

### Historic Phase 16 obligations and integrated closure
- [ ] Existing genuine customer-owned IDrive images save, reload, preview, publish and **persisted v2 rollback** (not simulated re-publish) with correct retained media.
- [ ] Bucket-scoped least-privilege proof through founder-approved canary or definitive provider-policy evidence; no unauthorized probing of unrelated buckets.
- [ ] Phase 15 real blog/news and media accessible and durable across both supported authoring modes; all 48 Layouts and preserved legacy site routes remain correct.
- [ ] Browser acceptance 320/390/768/1180/1440px, actual customer flow, interrupted connection, accessibility, visual regressions; least-privileged two-tenant HTTP tests; real LUCIA Core OAuth checked separately when available.
- [ ] Exact-head test/CI/Vercel preview and controlled production smoke evidence; release approval explicitly recorded. Green CI and merged historical PRs are insufficient without live storage/security/usability evidence.

## Delivery sequence / out-of-scope

1. Audit existing v2 versions/rollback, image storage and publishing APIs; close historical blockers.
2. Define v1 Code Import/Export/Manifest and source lifecycle, security policy, isolated origin.
3. Implement static-only code edit/preview/Deploy/rollback on one website. Demonstrate safe blank source and import from ChatGPT.
4. Extend across websites and domains, then add build sandbox for an approved framework subset **only if separately accepted**, with cost and security evidence.
5. Close unified real-user acceptance with Phase 14 + Phase 15; do not mark Phase 16 or programme complete before gates pass.

**Out of scope without further founder authorization:** unrestricted arbitrary server execution, customer-controlled Vercel tenant/project creation, production environment editing, arbitrary remote package scripts in shared runtime, marketplace hosting, second storage vendor/CMS, new billing/pricing or extra AI inference services.

**Definition of done:** Advanced customers can exercise real source-level freedom within secure, reversible deployments, while ordinary customers keep the fast direct-edit experience and all website data remains safe.
