-- Runtime identity/session isolation for the least-privilege LUCIA OS database role.
-- The OAuth callback sets app.is_auth_callback only after verified LUCIA Core identity exchange.
-- Session reads/deletes are scoped to a token hash derived from the HttpOnly session cookie.
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS app_users_session_read ON app_users;
--> statement-breakpoint
CREATE POLICY app_users_session_read ON app_users
  FOR SELECT USING (
    current_setting('app.is_auth_callback', true) = 'true'
    OR current_setting('app.is_platform_staff', true) = 'true'
    OR EXISTS (
      SELECT 1 FROM app_sessions AS s
      WHERE s.user_id = app_users.id
        AND s.token_hash = current_setting('app.current_session_token_hash', true)
        AND s.expires_at > now()
    )
  );
--> statement-breakpoint
DROP POLICY IF EXISTS app_users_auth_callback_insert ON app_users;
--> statement-breakpoint
CREATE POLICY app_users_auth_callback_insert ON app_users
  FOR INSERT WITH CHECK (current_setting('app.is_auth_callback', true) = 'true');
--> statement-breakpoint
DROP POLICY IF EXISTS app_users_auth_callback_update ON app_users;
--> statement-breakpoint
CREATE POLICY app_users_auth_callback_update ON app_users
  FOR UPDATE
  USING (current_setting('app.is_auth_callback', true) = 'true')
  WITH CHECK (current_setting('app.is_auth_callback', true) = 'true');
--> statement-breakpoint
ALTER TABLE app_sessions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS app_sessions_current_token_read ON app_sessions;
--> statement-breakpoint
CREATE POLICY app_sessions_current_token_read ON app_sessions
  FOR SELECT USING (
    token_hash = current_setting('app.current_session_token_hash', true)
    AND expires_at > now()
  );
--> statement-breakpoint
DROP POLICY IF EXISTS app_sessions_auth_callback_insert ON app_sessions;
--> statement-breakpoint
CREATE POLICY app_sessions_auth_callback_insert ON app_sessions
  FOR INSERT WITH CHECK (current_setting('app.is_auth_callback', true) = 'true');
--> statement-breakpoint
DROP POLICY IF EXISTS app_sessions_current_token_delete ON app_sessions;
--> statement-breakpoint
CREATE POLICY app_sessions_current_token_delete ON app_sessions
  FOR DELETE USING (token_hash = current_setting('app.current_session_token_hash', true));
