# LUCIA OS staff access bootstrap

## Purpose

This procedure establishes the first trusted LUCIA OS platform operator. It is separate from LUCIA Core's identity/operator bootstrap. LUCIA Core authenticates the person; this database grant authorizes platform operations inside LUCIA OS.

## First operator — one-time administrator action

1. The intended operator signs in through LUCIA ID at `https://os.lucia.name.ng` at least once. This creates the local `app_users` mapping after a successful Core callback.
2. Using a trusted database-administrator connection (never a public application route), inspect active local identities:

   ```sql
   SELECT id, display_name, core_subject_id
   FROM app_users
   WHERE active = true
   ORDER BY created_at;
   ```

3. Verify the intended person against their known, verified Core subject identifier and obtain the matching local `app_users.id`. Do not select an account by display name alone.
4. In a controlled database-admin session, grant the first platform-operator role to that exact local user UUID:

   ```sql
   BEGIN;

   INSERT INTO platform_staff_grants
     (user_id, role, status, granted_by_user_id, reason, expires_at, created_at, updated_at)
   SELECT
     id,
     'platform_operator',
     'active',
     id,
     'Initial LUCIA OS platform operator bootstrap',
     NULL,
     now(),
     now()
   FROM app_users
   WHERE id = '<VERIFIED_LOCAL_USER_UUID>'
     AND active = true
   ON CONFLICT (user_id, role) DO UPDATE
   SET status = 'active',
       granted_by_user_id = EXCLUDED.granted_by_user_id,
       reason = EXCLUDED.reason,
       expires_at = NULL,
       updated_at = now();

   -- Confirm exactly one intended active grant before committing.
   SELECT user_id, role, status, reason
   FROM platform_staff_grants
   WHERE user_id = '<VERIFIED_LOCAL_USER_UUID>'
     AND role = 'platform_operator';

   COMMIT;
   ```

   Replace the placeholder only after independently verifying the UUID. If the query does not return the intended active grant, roll back instead of committing.

5. The operator signs in again if needed and opens `/staff/team`. The application must still verify the active database grant on every request.

## Routine staff provisioning

- Each staff member first signs in with LUCIA ID once so a local user mapping exists.
- A platform operator opens `/staff/team`, chooses the correct local user, selects `support_agent` or `support_lead`, and records a reason.
- Grant/revoke operations are permission-checked server-side and audited. Revocation changes status to `revoked`; it does not delete the history.
- The UI intentionally cannot grant `platform_operator` or `security_reviewer`. Those elevated roles require a separate reviewed database-admin procedure.
- Organisation ownership, email/display name, and ordinary sign-in never grant platform staff access.

## Release gates

- Apply `drizzle/0013_staff_grant_management_rls.sql` only through the approved migration process after review and non-production verification.
- Never apply the migration or bootstrap SQL automatically from the public app.
- Verify a non-staff user receives a denial, a support agent can use only support permissions, and a platform operator can grant/revoke support roles.
- Do not claim production readiness until CI, migration/RLS verification, and live authenticated staff tests pass.
