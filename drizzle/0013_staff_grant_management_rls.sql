-- Allow server-authorized platform operators to manage explicit staff grants.
-- Application code must check staff.grants.manage before opening this transaction scope.
ALTER TABLE "platform_staff_grants" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "staff_grants_platform_select" ON "platform_staff_grants";
--> statement-breakpoint
CREATE POLICY "staff_grants_platform_select" ON "platform_staff_grants"
  FOR SELECT USING (current_setting('app.is_platform_staff', true) = 'true');
--> statement-breakpoint
DROP POLICY IF EXISTS "staff_grants_platform_insert" ON "platform_staff_grants";
--> statement-breakpoint
CREATE POLICY "staff_grants_platform_insert" ON "platform_staff_grants"
  FOR INSERT WITH CHECK (current_setting('app.is_platform_staff', true) = 'true');
--> statement-breakpoint
DROP POLICY IF EXISTS "staff_grants_platform_update" ON "platform_staff_grants";
--> statement-breakpoint
CREATE POLICY "staff_grants_platform_update" ON "platform_staff_grants"
  FOR UPDATE
  USING (current_setting('app.is_platform_staff', true) = 'true')
  WITH CHECK (current_setting('app.is_platform_staff', true) = 'true');

-- Staff support queues may display organisation names after staff permission checks.
--> statement-breakpoint
DROP POLICY IF EXISTS "organizations_platform_staff_read" ON "organizations";
--> statement-breakpoint
CREATE POLICY "organizations_platform_staff_read" ON "organizations"
  FOR SELECT USING (current_setting('app.is_platform_staff', true) = 'true');
--> statement-breakpoint

-- Staff writes remain gated by explicit application permission checks before
-- the transaction-local staff scope is set. RLS must then allow those writes.
--> statement-breakpoint
DROP POLICY IF EXISTS "support_cases_tenant_isolation" ON "support_cases";
--> statement-breakpoint
CREATE POLICY "support_cases_tenant_isolation" ON "support_cases"
  FOR ALL
  USING (
    "organization_id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
    OR current_setting('app.is_platform_staff', true) = 'true'
  )
  WITH CHECK (
    "organization_id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
    OR current_setting('app.is_platform_staff', true) = 'true'
  );
--> statement-breakpoint
DROP POLICY IF EXISTS "support_messages_tenant_isolation" ON "support_messages";
--> statement-breakpoint
CREATE POLICY "support_messages_tenant_isolation" ON "support_messages"
  FOR ALL
  USING (
    (
      "organization_id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
      AND "visibility" = 'customer'
    )
    OR current_setting('app.is_platform_staff', true) = 'true'
  )
  WITH CHECK (
    (
      "organization_id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
      AND "visibility" = 'customer'
    )
    OR current_setting('app.is_platform_staff', true) = 'true'
  );
