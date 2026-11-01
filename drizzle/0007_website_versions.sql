-- Durable website version history. Existing drafts and published content are untouched.
CREATE TABLE IF NOT EXISTS website_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  website_id uuid NOT NULL,
  created_by_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  label text NOT NULL CHECK (char_length(btrim(label)) BETWEEN 1 AND 80),
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 500),
  snapshot text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT website_versions_website_org_fk FOREIGN KEY (organization_id, website_id) REFERENCES websites(organization_id, id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS website_versions_org_id_id_uq ON website_versions(organization_id, id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS website_versions_org_website_created_idx ON website_versions(organization_id, website_id, created_at DESC);
--> statement-breakpoint
ALTER TABLE website_versions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY website_versions_tenant_isolation ON website_versions
  USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);
