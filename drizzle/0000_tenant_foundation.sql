CREATE TABLE IF NOT EXISTS "app_users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "core_subject_id" text NOT NULL,
  "display_name" text,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "app_users_core_subject_id_uq" ON "app_users" ("core_subject_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organizations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "organizations_slug_uq" ON "organizations" ("slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organizations_status_idx" ON "organizations" ("status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organization_memberships" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "app_users"("id") ON DELETE CASCADE,
  "role" text DEFAULT 'owner' NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "organization_memberships_org_user_uq" ON "organization_memberships" ("organization_id", "user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organization_memberships_user_status_idx" ON "organization_memberships" ("user_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organization_memberships_org_status_idx" ON "organization_memberships" ("organization_id", "status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "websites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "websites_org_slug_uq" ON "websites" ("organization_id", "slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "websites_org_status_idx" ON "websites" ("organization_id", "status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "website_pages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
  "website_id" uuid NOT NULL REFERENCES "websites"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "path" text NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "content" text DEFAULT '' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "website_pages_org_website_path_uq" ON "website_pages" ("organization_id", "website_id", "path");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "website_pages_org_website_idx" ON "website_pages" ("organization_id", "website_id");
--> statement-breakpoint
ALTER TABLE "websites" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "website_pages" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "websites_tenant_isolation" ON "websites"
  USING ("organization_id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "website_pages_tenant_isolation" ON "website_pages"
  USING ("organization_id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);
