-- Phase 15: News event metadata, attribution, featured placement and correction notices.
ALTER TABLE website_posts ADD COLUMN event_at timestamptz, ADD COLUMN is_featured boolean NOT NULL DEFAULT false, ADD COLUMN correction_note text, ADD COLUMN corrects_slug text;
--> statement-breakpoint
ALTER TABLE website_posts ADD CONSTRAINT website_posts_correction_note_length_check CHECK(correction_note IS NULL OR length(correction_note)<=500), ADD CONSTRAINT website_posts_corrects_slug_check CHECK(corrects_slug IS NULL OR corrects_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
--> statement-breakpoint
CREATE INDEX website_posts_featured_news_idx ON website_posts(organization_id,website_id,is_featured,published_at DESC) WHERE kind='news' AND status='published';
