-- Phase 1: secure foundations for staff access, support cases, and audit history.
-- No production migration is run by this change.
CREATE TABLE IF NOT EXISTS "platform_staff_grants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "app_users"("id") ON DELETE RESTRICT,
  "role" text NOT NULL CHECK ("role" IN ('support_agent','support_lead','platform_operator','security_reviewer')),
  "status" text NOT NULL DEFAULT 'active' CHECK ("status" IN ('active','suspended','revoked')),
  "granted_by_user_id" uuid REFERENCES "app_users"("id") ON DELETE RESTRICT,
  "reason" text NOT NULL CHECK (length(trim("reason")) > 0),
  "expires_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "platform_staff_grants_user_role_uq" UNIQUE ("user_id", "role")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_staff_grants_user_status_idx" ON "platform_staff_grants" ("user_id", "status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "support_cases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
  "created_by_user_id" uuid NOT NULL REFERENCES "app_users"("id") ON DELETE RESTRICT,
  "assigned_staff_user_id" uuid REFERENCES "app_users"("id") ON DELETE RESTRICT,
  "subject" text NOT NULL CHECK (length(trim("subject")) BETWEEN 3 AND 180),
  "category" text NOT NULL DEFAULT 'general' CHECK ("category" IN ('general','account','website','publishing','billing','security','abuse','other')),
  "priority" text NOT NULL DEFAULT 'normal' CHECK ("priority" IN ('low','normal','high','urgent')),
  "status" text NOT NULL DEFAULT 'open' CHECK ("status" IN ('open','in_progress','waiting_on_customer','waiting_on_staff','resolved','closed')),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "closed_at" timestamptz,
  CONSTRAINT "support_cases_org_id_id_uq" UNIQUE ("organization_id", "id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "support_cases_org_status_updated_idx" ON "support_cases" ("organization_id", "status", "updated_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "support_cases_assignee_status_idx" ON "support_cases" ("assigned_staff_user_id", "status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "support_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
  "case_id" uuid NOT NULL,
  "author_user_id" uuid NOT NULL REFERENCES "app_users"("id") ON DELETE RESTRICT,
  "author_kind" text NOT NULL CHECK ("author_kind" IN ('tenant','staff','system')),
  "visibility" text NOT NULL DEFAULT 'customer' CHECK ("visibility" IN ('customer','internal')),
  "body" text NOT NULL CHECK (length(trim("body")) BETWEEN 1 AND 12000),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "support_messages_case_org_fk" FOREIGN KEY ("organization_id", "case_id") REFERENCES "support_cases"("organization_id", "id") ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "support_messages_case_created_idx" ON "support_messages" ("organization_id", "case_id", "created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platform_audit_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_user_id" uuid REFERENCES "app_users"("id") ON DELETE SET NULL,
  "actor_kind" text NOT NULL CHECK ("actor_kind" IN ('tenant','staff','system')),
  "organization_id" uuid REFERENCES "organizations"("id") ON DELETE RESTRICT,
  "action" text NOT NULL,
  "target_type" text NOT NULL,
  "target_id" text,
  "purpose" text,
  "result" text NOT NULL CHECK ("result" IN ('success','denied','failure')),
  "request_id" text,
  "metadata" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_audit_events_org_created_idx" ON "platform_audit_events" ("organization_id", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_audit_events_actor_created_idx" ON "platform_audit_events" ("actor_user_id", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_audit_events_action_created_idx" ON "platform_audit_events" ("action", "created_at" DESC);
--> statement-breakpoint
ALTER TABLE "support_cases" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "support_messages" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "support_cases_tenant_isolation" ON "support_cases"
  USING (
    current_setting('app.is_platform_staff', true) = 'true'
    OR "organization_id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.is_platform_staff', true) = 'true'
    OR "organization_id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
  );
--> statement-breakpoint
CREATE POLICY "support_messages_tenant_isolation" ON "support_messages"
  USING (
    current_setting('app.is_platform_staff', true) = 'true'
    OR (
      "organization_id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
      AND "visibility" = 'customer'
    )
  )
  WITH CHECK (
    current_setting('app.is_platform_staff', true) = 'true'
    OR (
      "organization_id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
      AND "visibility" = 'customer'
    )
  );
--> statement-breakpoint
REVOKE UPDATE, DELETE ON "platform_audit_events" FROM PUBLIC;
