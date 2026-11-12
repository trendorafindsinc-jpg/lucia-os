-- Phase 15: safe, idempotent import identity for legacy JSON drafts.
ALTER TABLE website_posts ADD COLUMN legacy_source_id text;
--> statement-breakpoint
CREATE UNIQUE INDEX website_posts_legacy_source_uq ON website_posts(organization_id,website_id,legacy_source_id) WHERE legacy_source_id IS NOT NULL;
--> statement-breakpoint
ALTER TABLE website_post_revisions DROP CONSTRAINT IF EXISTS website_post_revisions_event_check;
ALTER TABLE website_post_revisions ADD CONSTRAINT website_post_revisions_event_check CHECK(event IN ('create','save','publish','unpublish','schedule','scheduled_publish','legacy_import'));
