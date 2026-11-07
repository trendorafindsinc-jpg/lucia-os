# LUCIA OS — Publishing Studio Upgrade

**Status:** Approved baseline · Phase 3 implementation in progress  
**Scope:** Five implementation phases  
**Repository:** `trendorafindsinc-jpg/lucia-os`  
**Staging:** `https://dev-os.lucia.name.ng`  
**Production:** `https://os.lucia.name.ng`

## 1. Product direction

LUCIA OS Blogging and News will provide a native, WordPress-inspired publishing experience based on the usability of the WordPress Gutenberg block editor.

This is a product-experience reference, not a decision to install WordPress or introduce WordPress as a backend. LUCIA OS remains authoritative for content, media, tenancy, publishing, and website integration.

The default authoring experience must be visual and approachable. Customers should be able to write and publish without editing stylesheets or knowing CSS. An optional HTML/code editing path may remain available for users who explicitly want it.

## 2. Guiding principles

- Extend the existing LUCIA OS content, website, and media architecture; inspect before rebuilding.
- Keep Blogging and News as clearly managed publishing content types with appropriate shared foundations.
- Store content as structured, reusable blocks rather than making CSS or raw HTML the default authoring format.
- Render published content through each website's existing design, theme/layout, navigation, and responsive behavior.
- Preserve tenant isolation, website ownership checks, authorization, and private-media access controls.
- Reuse the existing media/storage system; do not create a parallel upload or storage backend.
- Keep advanced HTML/code editing optional and safely isolated from the normal editor.
- Avoid unnecessary changes to LUCIA Core, authentication, or unrelated workspace features.

## 3. Five-phase delivery plan

### Phase 1 — Publishing foundation

Establish the native content model and editor foundation.

Scope:
- Inspect and map the current blogging, news, content, website, and media implementation.
- Define structured, reusable content blocks and a durable content representation.
- Support Posts and News as distinct publishing content types.
- Support creating, editing, saving, and reopening drafts.
- Add autosave or safe draft persistence appropriate to the existing architecture.
- Preserve tenant and website ownership boundaries.

Acceptance outcomes:
- A tenant can create and reopen a draft post and a draft news article.
- Structured content persists and can be loaded without losing block order or data.
- Cross-tenant access is denied.
- Existing customer content and websites remain intact.

### Phase 2 — WordPress-style block editor

Deliver the primary writing experience.

Scope:
- Provide a clean, distraction-free writing canvas with a prominent title field.
- Support paragraphs, headings, lists, quotes, tables, links, and inline text formatting.
- Provide intuitive block insertion, selection, movement, duplication, and removal.
- Make common editing actions discoverable without requiring code or stylesheet knowledge.
- Preserve content while switching between editing and preview.

Acceptance outcomes:
- A user can compose and edit a complete article using the visual block editor alone.
- Blocks can be reordered and edited without content loss.
- The editor is usable on supported desktop and mobile screen sizes.
- CSS is not required for ordinary writing or formatting.

### Phase 3 — Media and rich content

Connect rich content to the existing LUCIA media/storage system.

Priority Zero release gate: published Blog and News content must be discoverable on the exact active public hostname registered to the website. The publishing workspace must never derive a public hostname by appending a production-only suffix to a website slug. A successful publish response must confirm a published status, snapshot, slug, and publication timestamp before the editor reports success.

Phase 3 must verify the entire journey against the same staging database used by the development deployment: create/save, publish, public listing, public detail route, and media delivery. Drafts remain private and tenant-scoped.

Scope:
- Upload and insert images, galleries, video, and audio where supported.
- Support featured images, captions, alternative text, and download links.
- Support embeds for YouTube, Spotify, and other approved external providers.
- Validate and safely render embed URLs and provider content.
- Reuse existing media records, private-media delivery, and storage integration.
- Preserve tenant isolation and authorization for every media operation.

Acceptance outcomes:
- A user can upload/select media and insert it into an article.
- Media resolves correctly in the editor, preview, and published page.
- Private media cannot be accessed across tenants or by unauthorized users.
- Supported embeds render safely; unsupported or invalid embeds fail gracefully.

### Phase 4 — Publishing and News management

Deliver editorial controls and the News workflow.

Scope:
- Support categories, tags, authors, permalinks, and featured images.
- Provide draft, preview, publish, and scheduled-publishing workflows where scheduling is supported by the existing platform architecture.
- Provide dedicated News management, including breaking-news labels.
- Support publication dates and clear article status.
- Provide SEO title, meta description, and social-sharing metadata.
- Enforce authorization for editorial and publishing actions.

Acceptance outcomes:
- Authorized users can manage article metadata and publishing status.
- Draft content is not exposed as public content.
- Published posts and news articles have stable, readable URLs.
- News items can be distinguished and presented separately from general blog posts.

### Phase 5 — Website integration and release

Connect the publishing system to customer websites and prepare the release.

Scope:
- Render published blog and news content on the relevant website pages.
- Provide article detail pages using the website's existing layout and design.
- Integrate blog/news navigation and listing surfaces with the website.
- Ensure Layout Studio controls presentation while the publishing editor controls article content.
- Verify responsive presentation, media, embeds, metadata, and public/private visibility.
- Complete a realistic staging journey from draft creation through public publication.
- Resolve material acceptance issues and prepare a production release for explicit approval.

Acceptance outcomes:
- A customer can create a post, preview it, publish it, and view it on their website.
- A customer can create and publish a news article and see it in the website's News experience.
- Article content follows the website's selected design without requiring stylesheet editing.
- Existing websites and unrelated workspace features continue to work.
- Production remains unchanged until the user explicitly approves the release.

## 4. Explicit non-goals and safeguards

- Do not install WordPress or add a separate WordPress backend.
- Do not replace Layout Studio or redesign unrelated workspace areas as part of this scope.
- Do not make CSS or stylesheet editing the default content-authoring experience.
- Do not remove the optional HTML/code path if it is already supported or approved for implementation.
- Do not introduce duplicate media storage, duplicate authentication, or a second tenancy model.
- Do not change production data, credentials, or deployments during staging implementation.
- Do not merge to `main` without explicit user approval.

## 5. Required delivery workflow

The approved workflow applies to every phase:

1. Create a focused feature branch from the current `development` branch.
2. Implement only the scoped phase and integrate the work into `development`.
3. Deploy and review through the staging environment at `https://dev-os.lucia.name.ng`.
4. Present the working customer-facing result for the user's review and obtain explicit approval.
5. Only after approval, merge the approved release into `main` and deploy production at `https://os.lucia.name.ng`.

Environment rules:
- `development` is the permanent staging/integration branch.
- `main` is production-only.
- Staging and production databases, credentials, and data remain separate.
- Production must not be modified as part of ordinary development or staging verification.

## 6. Verification philosophy

Verification must be risk-based, focused, and useful. Prioritize the real customer journey and the security boundaries that protect it. Avoid repetitive checks that do not add evidence or reduce risk.

For each phase, verify the acceptance outcomes relevant to that phase, especially:
- Draft creation, save, reload, and editing.
- Tenant and website ownership enforcement.
- Media authorization and correct object resolution.
- Preview versus public publication visibility.
- Article rendering on the actual customer website.
- Responsive behavior for the primary authoring and reading flows.

Record material failures, fix them, and recheck the affected path. Do not turn verification into an endless exercise or expand scope without a concrete reason.

## 7. Release authority

This document records the user's approval of the five-phase product plan and the development workflow. It does **not** authorize production deployment, production data changes, or merging any implementation release into `main`. Those actions require the user's explicit approval at the appropriate release point.
