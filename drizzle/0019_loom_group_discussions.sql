ALTER TABLE loom_posts ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES loom_groups(id) ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS loom_posts_group_created_idx ON loom_posts(group_id, created_at DESC);
