ALTER TABLE loom_profiles ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'visible' CHECK (moderation_status IN ('visible', 'hidden'));
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS loom_profiles_moderation_status_idx ON loom_profiles(moderation_status);
