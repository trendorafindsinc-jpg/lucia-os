CREATE TABLE workspace_preferences (
 user_id uuid PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
 preferences jsonb NOT NULL,
 revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT workspace_preferences_size CHECK (octet_length(preferences::text) <= 8192)
);
--> statement-breakpoint
ALTER TABLE workspace_preferences ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE workspace_preferences FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY workspace_preferences_owner ON workspace_preferences FOR ALL
 USING (user_id = nullif(current_setting('app.current_user_id', true), '')::uuid)
 WITH CHECK (user_id = nullif(current_setting('app.current_user_id', true), '')::uuid);
--> statement-breakpoint
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lucia_os_runtime') THEN
  GRANT SELECT, INSERT, UPDATE ON workspace_preferences TO lucia_os_runtime;
 END IF;
END $$;
