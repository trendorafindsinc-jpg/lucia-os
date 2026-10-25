# Phase 10 — persisted page and navigation structure

## Ownership and storage

- LUCIA Core authenticates the user; LUCIA OS is authoritative for local organisation membership and website permissions.
- `website_structures` stores the validated page map, homepage identity, navigation page IDs, and ordered reusable-section types as one versioned-by-replacement JSON document per website.
- The structure record is separate from `website_pages.content`, editor drafts, and the last published version. Editing navigation must not overwrite page content or publish changes.
- A composite foreign key binds each structure record to the matching `(organization_id, website_id)`. A unique index permits one current structure per website.
- RLS uses transaction-local `app.current_organization_id`; route handlers set this context only after local membership and action permission checks.

## API contract

- `GET /api/websites/:websiteId/structure`: requires an authenticated local session and `website.read`. If no structure has been saved yet, returns a validated initial structure without persisting it.
- `PATCH /api/websites/:websiteId/structure`: requires `website.edit`, validates the complete structure, and atomically inserts or replaces the website's structure.
- Invalid UUIDs and malformed payloads fail closed. Invalid stored JSON is reported as an error; it is never silently reset or overwritten.
- Page IDs and navigation IDs must be unique; navigation may reference only existing pages; page slugs must be unique; the selected homepage must use the root slug; page count, section count, and navigation count are bounded by the schema.

## Editor behavior

- Open the Pages & Navigation screen with `?websiteId=<saved website UUID>` to load the saved structure.
- Changes remain draft-only until the user explicitly chooses **Save structure**. Publishing remains a separate operation.
- If loading fails, saving is disabled to avoid overwriting saved data with the default local structure.
- Without a saved website ID, the editor remains a local-only prototype.

## Verification still required

- Run the migration on a disposable Neon branch and inspect rollback/recovery before production use.
- Use a non-owner `LOGIN NOBYPASSRLS` role to prove missing-context and cross-tenant read/write denial.
- Exercise authenticated/unauthenticated routes, permission denial, malformed payloads, duplicate slugs, refresh/reopen persistence, save failure, and concurrent updates.
- Confirm the page/section structure is consumed by the shared Loom renderer before considering Phase 10 complete.
- Do not run a production migration or deploy solely because this code has been merged.
