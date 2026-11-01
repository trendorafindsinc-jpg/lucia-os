-- Persist blog/media references and SEO settings independently from published output.
CREATE TABLE IF NOT EXISTS website_content_libraries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  website_id uuid NOT NULL,
  created_by_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  library text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT website_content_libraries_website_org_fk
    FOREIGN KEY (organization_id, website_id)
    REFERENCES websites(organization_id, id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS website_content_libraries_org_website_uq
  ON website_content_libraries(organization_id, website_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS website_content_libraries_org_id_id_uq
  ON website_content_libraries(organization_id, id);
--> statement-breakpoint
ALTER TABLE website_content_libraries ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS website_content_libraries_tenant_isolation ON website_content_libraries;
--> statement-breakpoint
CREATE POLICY website_content_libraries_tenant_isolation ON website_content_libraries
  USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS website_seo_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  website_id uuid NOT NULL,
  created_by_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  settings text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT website_seo_settings_website_org_fk
    FOREIGN KEY (organization_id, website_id)
    REFERENCES websites(organization_id, id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS website_seo_settings_org_website_uq
  ON website_seo_settings(organization_id, website_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS website_seo_settings_org_id_id_uq
  ON website_seo_settings(organization_id, id);
--> statement-breakpoint
ALTER TABLE website_seo_settings ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS website_seo_settings_tenant_isolation ON website_seo_settings;
--> statement-breakpoint
CREATE POLICY website_seo_settings_tenant_isolation ON website_seo_settings
  USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);
