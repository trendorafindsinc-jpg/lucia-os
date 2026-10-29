CREATE TABLE IF NOT EXISTS loom_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  blocked_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (blocker_user_id <> blocked_user_id)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS loom_blocks_pair_uq ON loom_blocks(blocker_user_id, blocked_user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS loom_blocks_blocked_created_idx ON loom_blocks(blocked_user_id, created_at);
