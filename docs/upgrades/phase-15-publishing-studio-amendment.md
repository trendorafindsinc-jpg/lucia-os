# Phase 15 Amendment — Dedicated Blog & News Publishing Studio

**Repository:** `trendorafindsinc-jpg/lucia-os`  
**Target branch:** `upgrade/phase-15-content-media`  
**Related pull request:** #144  
**Status:** Approved for implementation  
**Scope:** Publishing experience and customer workflow; preserve the existing content and media architecture.

## 1. Product decision

LUCIA OS must provide a dedicated, WordPress/Blogger-familiar publishing experience for each website. Blog and News should feel like first-class publishing products, not a collection of fields embedded in the visual website editor.

This is **WordPress-like, not WordPress-powered**. Do not install WordPress, introduce a WordPress dependency, or create a second CMS/backend. Retain LUCIA OS as the sole source of truth for identity, website ownership, articles, revisions, publication, scheduling, media and rendering.

## 2. Customer experience

Add a distinct **Publishing Studio** entry point in the website workspace/navigation. It must open in the context of the selected website and provide a clear route back to the website and its visual editor.

The Publishing Studio should have these areas:

- **Overview:** publishing activity, useful counts and recent posts.
- **All Posts:** searchable, filterable list of blog and news content with clear status, type, category and updated/published date.
- **Blog:** dedicated blog workflow and list.
- **Newsroom:** dedicated news workflow and list, retaining news-specific metadata.
- **Categories & Tags:** manage and assign taxonomy using the existing supported data model; do not invent a parallel taxonomy store.
- **Media Library:** reuse the website's existing secure media library and upload workflow.
- **Scheduled:** upcoming scheduled content and its publication status.
- **Revisions:** accessible from an article's editing experience.

The interface should use familiar publishing conventions: clear navigation, list tables/cards, search and filters, bulk-safe selection where supported, status labels, pagination or sensible loading, and prominent but not overwhelming “New Post” / “New News Story” actions. Avoid a single long, vertically stacked form as the primary product experience.

## 3. Article writing workspace

Opening or creating an article should lead to a focused editor with:

### Main writing canvas
- Large title/headline field.
- Summary/excerpt field.
- Comfortable distraction-free writing area.
- Familiar formatting toolbar and semantic content blocks: paragraphs, headings, lists, quotes, links, images and supported embeds.
- Rich-text mode as the default.
- Markdown and HTML source modes remain available for users who prefer them.
- Switching editor modes must preserve content without silent loss or corruption.
- Use the existing sanitization and embed allow-list. Never render arbitrary scripts or unsafe markup.

### Publishing/settings panel
Organize metadata into clearly named, collapsible groups rather than placing every field in one uninterrupted form:
- Status and publication controls.
- Featured image and media selection.
- Blog/news type and category.
- Tags.
- Author/byline only where supported by the current identity model.
- SEO title and description.
- News-specific event date, featured status, correction notice and corrected-story reference.
- Schedule date/time and timezone clarity.

### Top action bar
Provide persistent, clearly differentiated actions:
- Save Draft.
- Preview.
- Schedule.
- Publish / Update.
- Unpublish where applicable.

Show save state, unsaved changes, errors and publication state clearly. Confirm destructive/discard actions. Preserve revision history and restore-as-draft behavior.

## 4. Blog and News distinction

Blog and News share the existing article engine, storage, revisions, secure media, rendering and publishing lifecycle. They must not become duplicate systems.

They should nevertheless have distinct customer-facing entry points and workflows:
- **Blog** is for evergreen articles, opinions, guides, stories and long-form content.
- **News** is for announcements and time-sensitive stories, with newsroom-specific event date, featured story and correction metadata already supported by the model.

Do not force News-specific fields into the default Blog writing flow. Do not remove or weaken existing News metadata.

## 5. Website integration and public output

- Publishing Studio is scoped to the currently selected website and authorized account/tenant.
- Keep the visual website editor focused on site design, layout, pages and visual customization.
- The Publishing Studio should link back to “Edit Website” and “View Website”.
- Published Blog and News content must continue to render through the website's selected design and existing public article routes.
- Preserve existing article URLs, slug redirects, SEO behavior, scheduled publication, public-domain/host binding and access controls.
- Preview must clearly distinguish private draft preview from a public published URL.
- Do not publish or expose drafts through public routes.

## 6. Architecture and non-goals

### Reuse
Before implementation, trace the existing Phase 15 components, APIs, article model, migrations, RLS policies, media library, embed handling, sanitization, scheduled publication and public renderer. Extend them.

### Explicitly do not
- Add WordPress, Blogger or another external CMS as a runtime dependency.
- Create a second article database, taxonomy system, media store, auth flow or publishing scheduler.
- Duplicate LUCIA Core identity or website ownership checks.
- Replace the website visual editor or existing website layout engine.
- Rebuild already-working content/media backend capabilities without evidence of a defect.
- Change production data or apply new production migrations without a demonstrated requirement and a documented safe migration plan.

## 7. Accessibility, responsive behavior and quality

- Mobile-first responsive publishing experience; no horizontal overflow on phone-sized viewports.
- Keyboard-accessible navigation, toolbar, dialogs, menus, filters and editor controls.
- Visible focus states, semantic labels, accessible names and status announcements.
- Avoid icon-only controls without accessible labels.
- Preserve content on network failures and conflicting edits.
- Loading, empty, error, offline and permission-denied states must be intentional and helpful.
- Confirm timezone handling for scheduled publishing.
- Do not claim upload acceptance based only on database rows or mocked UI.

## 8. Implementation sequence

1. Audit current branch and trace the complete article lifecycle and workspace navigation. Record what already works and what is genuinely missing.
2. Document the proposed route/component structure and data flow before changing code.
3. Implement the dedicated Publishing Studio shell and website-scoped navigation.
4. Implement the overview, All Posts, Blog, Newsroom and Scheduled views using existing APIs and model fields.
5. Refactor the article editor into the focused canvas + settings panel + action bar experience, preserving rich text, Markdown, HTML, media, embeds, preview, revisions, schedule and publish behavior.
6. Connect all public output and visual editor handoffs without changing existing URLs or duplicating state.
7. Add/update unit, component, API, security and browser tests.
8. Run migrations only if required; explain why and verify rollback/safety. Do not reapply migrations 0016–0029: production has already had them applied and the Drizzle journal synchronized.
9. Produce genuine customer-journey evidence and report any blocked external service acceptance honestly.

## 9. Acceptance criteria

### Publishing navigation and workspace
- A customer can open Publishing Studio from a selected website and see only that website's content.
- They can navigate between Overview, All Posts, Blog, Newsroom, Categories & Tags, Media Library and Scheduled.
- They can return to the visual editor and public website without losing saved work.
- Empty states explain how to create the first post/story.

### Authoring lifecycle
- Create, save, reload, edit, preview, schedule, publish, update and unpublish work through the real APIs.
- Rich text, Markdown and HTML modes preserve the same article content.
- Featured image, inline image/media, supported embeds, links and PDF/video workflows use the existing secure media pipeline.
- Revisions are recorded and can be restored as a new draft.
- News-specific metadata is editable and retained; Blog is not cluttered with irrelevant News fields.
- Slug changes preserve existing redirect behavior.

### Security and tenant isolation
- Existing authorization and RLS protections remain effective.
- A user cannot view or mutate another website's articles, media or revisions.
- Drafts and scheduled stories are not publicly accessible before publication.
- Public article access continues to require the existing active website-domain host binding.

### Quality evidence
- Tests cover the important editor modes, save conflicts, failed requests, permissions, scheduling, revisions, responsive layouts and accessibility.
- Browser tests exercise the actual customer journey, not only isolated component rendering.
- External storage upload is tested against the configured storage service with a real upload and retrieval; mocks do not count as acceptance.
- Report test commands, results, screenshots or trace evidence where available, unresolved blockers and exact production-readiness status.

## 10. Definition of done

The amendment is complete when the dedicated Publishing Studio feels like a coherent, familiar publishing product; its workflows are connected to the existing LUCIA OS website and content engine; all acceptance criteria have evidence; and no duplicate CMS/backend has been introduced.

Do not merge PR #144 without the user's explicit approval.
