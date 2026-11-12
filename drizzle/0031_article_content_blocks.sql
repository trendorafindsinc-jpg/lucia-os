-- Phase 1: durable structured article blocks. Existing body and published snapshots remain untouched.
ALTER TABLE website_posts
  ADD COLUMN content_blocks jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE website_posts
  ADD CONSTRAINT website_posts_content_blocks_array_check
  CHECK (jsonb_typeof(content_blocks) = 'array' AND jsonb_array_length(content_blocks) <= 200);
