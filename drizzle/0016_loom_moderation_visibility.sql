ALTER TABLE loom_posts ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'visible' CHECK (moderation_status IN ('visible', 'hidden'));
--> statement-breakpoint
ALTER TABLE loom_replies ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'visible' CHECK (moderation_status IN ('visible', 'hidden'));
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS loom_posts_moderation_created_idx ON loom_posts(moderation_status, created_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS loom_replies_moderation_post_created_idx ON loom_replies(post_id, moderation_status, created_at);
