CREATE TABLE IF NOT EXISTS loom_member_restrictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'restricted' CHECK (status IN ('restricted', 'banned', 'lifted')),
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 3 AND 1000),
  created_by_staff_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  expires_at timestamptz,
  lifted_at timestamptz,
  lifted_by_staff_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS loom_member_restrictions_user_uq ON loom_member_restrictions(user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS loom_member_restrictions_status_expires_idx ON loom_member_restrictions(status, expires_at);
