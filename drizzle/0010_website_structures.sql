-- Persist page structure separately from page content, drafts and published snapshots.
CREATE TABLE IF NOT EXISTS website_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  website_id uuid NOT NULL,
  created_by_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  structure text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT website_structures_website_org_fk
    FOREIGN KEY (organization_id, website_id)
    REFERENCES websites(organization_id, id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS website_structures_org_website_uq
  ON website_structures(organization_id, website_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS website_structures_org_id_id_uq
  ON website_structures(organization_id, id);
--> statement-breakpoint
ALTER TABLE website_structures ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS website_structures_tenant_isolation ON website_structures;
--> statement-breakpoint
CREATE POLICY website_structures_tenant_isolation ON website_structures
  USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);
