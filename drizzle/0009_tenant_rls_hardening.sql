-- Phase 2: enforce transaction-scoped tenant and user visibility in PostgreSQL.
-- These policies complement (not replace) verified-session and permission checks
-- in the application. App queries must use a non-owner role without BYPASSRLS.
--> statement-breakpoint
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "organization_memberships" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "organizations_member_read" ON "organizations";
--> statement-breakpoint
CREATE POLICY "organizations_member_read" ON "organizations"
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM "organization_memberships" AS membership
      WHERE membership."organization_id" = "organizations"."id"
        AND membership."user_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        AND membership."status" = 'active'
    )
    OR "id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
  );
--> statement-breakpoint
DROP POLICY IF EXISTS "organizations_user_create" ON "organizations";
--> statement-breakpoint
CREATE POLICY "organizations_user_create" ON "organizations"
  FOR INSERT WITH CHECK (
    NULLIF(current_setting('app.current_user_id', true), '') IS NOT NULL
  );
--> statement-breakpoint
DROP POLICY IF EXISTS "organizations_scoped_update" ON "organizations";
--> statement-breakpoint
CREATE POLICY "organizations_scoped_update" ON "organizations"
  FOR UPDATE
  USING ("id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid)
  WITH CHECK ("id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS "organizations_scoped_delete" ON "organizations";
--> statement-breakpoint
CREATE POLICY "organizations_scoped_delete" ON "organizations"
  FOR DELETE USING ("id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS "memberships_user_or_tenant_read" ON "organization_memberships";
--> statement-breakpoint
CREATE POLICY "memberships_user_or_tenant_read" ON "organization_memberships"
  FOR SELECT USING (
    "user_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    OR "organization_id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
  );
--> statement-breakpoint
DROP POLICY IF EXISTS "memberships_tenant_insert" ON "organization_memberships";
--> statement-breakpoint
CREATE POLICY "memberships_tenant_insert" ON "organization_memberships"
  FOR INSERT WITH CHECK (
    "organization_id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
  );
--> statement-breakpoint
DROP POLICY IF EXISTS "memberships_tenant_update" ON "organization_memberships";
--> statement-breakpoint
CREATE POLICY "memberships_tenant_update" ON "organization_memberships"
  FOR UPDATE
  USING ("organization_id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS "memberships_tenant_delete" ON "organization_memberships";
--> statement-breakpoint
CREATE POLICY "memberships_tenant_delete" ON "organization_memberships"
  FOR DELETE USING ("organization_id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);
--> statement-breakpoint
ALTER TABLE "billing_invoices" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "billing_invoices_tenant_isolation" ON "billing_invoices";
--> statement-breakpoint
CREATE POLICY "billing_invoices_tenant_isolation" ON "billing_invoices"
  USING ("organization_id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);
--> statement-breakpoint
ALTER TABLE "billing_payment_attempts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "billing_payment_attempts_tenant_isolation" ON "billing_payment_attempts";
--> statement-breakpoint
CREATE POLICY "billing_payment_attempts_tenant_isolation" ON "billing_payment_attempts"
  USING ("organization_id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);
--> statement-breakpoint
ALTER TABLE "billing_webhook_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "billing_webhook_events_tenant_isolation" ON "billing_webhook_events";
--> statement-breakpoint
CREATE POLICY "billing_webhook_events_tenant_isolation" ON "billing_webhook_events"
  USING ("organization_id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);
--> statement-breakpoint
ALTER TABLE "support_cases" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "support_cases_tenant_isolation" ON "support_cases";
--> statement-breakpoint
CREATE POLICY "support_cases_tenant_isolation" ON "support_cases"
  USING (
    "organization_id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
    OR current_setting('app.is_platform_staff', true) = 'true'
  )
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);
--> statement-breakpoint
ALTER TABLE "support_messages" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "support_messages_tenant_isolation" ON "support_messages";
--> statement-breakpoint
CREATE POLICY "support_messages_tenant_isolation" ON "support_messages"
  USING (
    "organization_id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
    OR current_setting('app.is_platform_staff', true) = 'true'
  )
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);
--> statement-breakpoint
ALTER TABLE "platform_staff_grants" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "staff_grants_self_read" ON "platform_staff_grants";
--> statement-breakpoint
CREATE POLICY "staff_grants_self_read" ON "platform_staff_grants"
  FOR SELECT USING (
    "user_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  );
--> statement-breakpoint
ALTER TABLE "platform_audit_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "audit_events_tenant_or_actor_read" ON "platform_audit_events";
--> statement-breakpoint
CREATE POLICY "audit_events_tenant_or_actor_read" ON "platform_audit_events"
  FOR SELECT USING (
    ("organization_id" IS NOT NULL AND "organization_id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid)
    OR "actor_user_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    OR current_setting('app.is_platform_staff', true) = 'true'
  );
--> statement-breakpoint
DROP POLICY IF EXISTS "audit_events_tenant_insert" ON "platform_audit_events";
--> statement-breakpoint
CREATE POLICY "audit_events_tenant_insert" ON "platform_audit_events"
  FOR INSERT WITH CHECK (
    "organization_id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
    OR current_setting('app.is_platform_staff', true) = 'true'
  );
