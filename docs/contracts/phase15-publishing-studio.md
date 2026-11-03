# Phase 15 — Publishing Studio implementation contract

## Route and website scope

- Route: `/publishing?websiteId=<uuid>`.
- Workspace route identity: `website-engine:website:<websiteId>`, shared with Layout Studio so both tools retain the same selected website context.
- Entry points: website cards in `/workspace/websites` and the premium visual editor toolbar.
- Exit paths: the Publishing Studio header links to Edit Website and View Website; the article editor has a guarded return to Publishing Studio.
- The server page requires the existing LUCIA ID session. Article and media data continue to be authorized by their existing website-scoped APIs.

## Data flow

- Lists and overview counts use `GET /api/websites/:websiteId/articles`.
- Create, save, schedule, publish and unpublish remain on the existing article endpoints.
- Revisions and restore-as-draft remain on the existing revisions endpoint.
- The authoring experience reuses `WebsiteStoryStudio`; the new workspace adds Overview, All Posts, Blog, Newsroom, Categories & Tags, Media Library and Scheduled navigation.
- Media selection and upload continue through `MediaLibrary` and the existing secure external-storage pipeline.
- Public links preserve the existing `/blog/:slug` and `/news/:slug` route contract on the website platform hostname.

## Model constraints

- Blog and News remain records in the same `website_posts` store.
- News-only event date, featured state and correction fields appear only for News.
- Category is the existing article-level string and tags are the existing article-level string array. Categories & Tags therefore reports values already used and does not create global taxonomy records or a parallel taxonomy API.
- The article listing endpoint currently returns at most 200 records. The UI provides search and filters over that returned set; cursor pagination remains a follow-up if customer content exceeds this limit.
- Scheduling displays the browser's resolved IANA timezone and submits the selected local time as an ISO timestamp. The existing server-side scheduler remains authoritative.

## Safety and migration

- No new database tables or migrations are introduced by the Publishing Studio UI.
- No changes are made to the existing article storage, RLS, authorization, revision, media, sanitization or scheduled-worker architecture.
- No WordPress/Blogger runtime or duplicate CMS is introduced.
- Drafts remain private through the existing API and public-renderer authorization.

## Acceptance boundary

A successful Vercel build proves compilation only. Browser acceptance must still verify the authenticated customer workflow, tenant isolation, public host binding, schedule execution, conflict/revision behavior and actual external-storage upload plus retrieval. A mocked upload or a media database row is not external-storage acceptance.
