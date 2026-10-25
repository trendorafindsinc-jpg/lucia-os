CREATE TABLE IF NOT EXISTS loom_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  business_name text,
  bio text NOT NULL DEFAULT '',
  website text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS loom_profiles_user_uq ON loom_profiles(user_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS loom_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  slug text NOT NULL,
  description text NOT NULL DEFAULT '',
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'restricted', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS loom_groups_slug_uq ON loom_groups(slug);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS loom_groups_status_created_idx ON loom_groups(status, created_at DESC);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS loom_group_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES loom_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'moderator', 'member')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'blocked')),
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS loom_group_memberships_group_user_uq ON loom_group_memberships(group_id, user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS loom_group_memberships_user_status_idx ON loom_group_memberships(user_id, status);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS loom_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (requester_user_id <> recipient_user_id)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS loom_connections_request_recipient_uq ON loom_connections(requester_user_id, recipient_user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS loom_connections_recipient_status_idx ON loom_connections(recipient_user_id, status);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS loom_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES loom_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  reaction text NOT NULL DEFAULT 'like' CHECK (reaction IN ('like', 'insightful', 'support')),
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS loom_reactions_post_user_uq ON loom_reactions(post_id, user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS loom_reactions_post_created_idx ON loom_reactions(post_id, created_at DESC);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS loom_saved_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES loom_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS loom_saved_posts_user_post_uq ON loom_saved_posts(user_id, post_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS loom_saved_posts_user_created_idx ON loom_saved_posts(user_id, created_at DESC);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS loom_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('post', 'reply', 'profile', 'message', 'group')),
  target_id text NOT NULL,
  reason text NOT NULL CHECK (reason IN ('spam', 'harassment', 'misinformation', 'privacy', 'other')),
  details text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  reviewed_by_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS loom_reports_status_created_idx ON loom_reports(status, created_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS loom_reports_reporter_created_idx ON loom_reports(reporter_user_id, created_at DESC);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS loom_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (sender_user_id <> recipient_user_id)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS loom_messages_inbox_idx ON loom_messages(recipient_user_id, read_at, created_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS loom_messages_conversation_idx ON loom_messages(sender_user_id, recipient_user_id, created_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS loom_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  kind text NOT NULL,
  target_id text,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS loom_notifications_user_read_created_idx ON loom_notifications(user_id, read_at, created_at DESC);
