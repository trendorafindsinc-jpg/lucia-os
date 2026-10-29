CREATE TABLE IF NOT EXISTS loom_action_limits (
  limit_key text PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS loom_action_limits_window_idx ON loom_action_limits(window_started_at);
