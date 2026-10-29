CREATE TABLE IF NOT EXISTS loom_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS loom_posts_created_idx ON loom_posts(created_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS loom_posts_author_idx ON loom_posts(author_user_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS loom_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES loom_posts(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS loom_replies_post_created_idx ON loom_replies(post_id, created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS loom_replies_author_idx ON loom_replies(author_user_id);
