-- Phase 15: structured article taxonomy and search/social metadata.
ALTER TABLE website_posts
  ADD COLUMN tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN seo_title text,
  ADD COLUMN seo_description text;
--> statement-breakpoint
ALTER TABLE website_posts
  ADD CONSTRAINT website_posts_tags_array_check
    CHECK (jsonb_typeof(tags) = 'array' AND jsonb_array_length(tags) <= 12),
  ADD CONSTRAINT website_posts_seo_title_length_check
    CHECK (seo_title IS NULL OR length(seo_title) <= 70),
  ADD CONSTRAINT website_posts_seo_description_length_check
    CHECK (seo_description IS NULL OR length(seo_description) <= 160);
--> statement-breakpoint
CREATE INDEX website_posts_tags_gin_idx ON website_posts USING gin(tags);
