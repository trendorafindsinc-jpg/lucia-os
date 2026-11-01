-- Phase 15: audited draft-only revision restoration.
ALTER TABLE website_post_revisions DROP CONSTRAINT IF EXISTS website_post_revisions_event_check;
ALTER TABLE website_post_revisions ADD CONSTRAINT website_post_revisions_event_check CHECK(event IN ('create','save','publish','unpublish','schedule','scheduled_publish','legacy_import','restore'));
