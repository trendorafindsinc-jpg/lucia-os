-- Durable form definitions/submissions and privacy-minimised analytics events.
CREATE TABLE IF NOT EXISTS website_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  website_id uuid NOT NULL,
  form_key text NOT NULL,
  definition text NOT NULL,
  notification_settings text NOT NULL,
  created_by_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT website_forms_website_org_fk FOREIGN KEY (organization_id, website_id)
    REFERENCES websites(organization_id, id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS website_forms_org_website_key_uq
  ON website_forms(organization_id, website_id, form_key);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS website_forms_org_id_id_uq ON website_forms(organization_id, id);
--> statement-breakpoint
ALTER TABLE website_forms ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS website_forms_tenant_isolation ON website_forms;
--> statement-breakpoint
CREATE POLICY website_forms_tenant_isolation ON website_forms
  USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS website_form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  website_id uuid NOT NULL,
  form_key text NOT NULL,
  values text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'archived')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  retention_until timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
  CONSTRAINT website_form_submissions_website_org_fk FOREIGN KEY (organization_id, website_id)
    REFERENCES websites(organization_id, id) ON DELETE CASCADE,
  CONSTRAINT website_form_submissions_form_fk FOREIGN KEY (organization_id, website_id, form_key)
    REFERENCES website_forms(organization_id, website_id, form_key) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS website_form_submissions_org_id_id_uq ON website_form_submissions(organization_id, id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS website_form_submissions_org_website_submitted_idx
  ON website_form_submissions(organization_id, website_id, submitted_at);
--> statement-breakpoint
ALTER TABLE website_form_submissions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS website_form_submissions_tenant_isolation ON website_form_submissions;
--> statement-breakpoint
CREATE POLICY website_form_submissions_tenant_isolation ON website_form_submissions
  USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS website_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  website_id uuid NOT NULL,
  event_name text NOT NULL CHECK (event_name IN ('page_view', 'cta_click', 'form_start', 'form_submit')),
  session_hash text NOT NULL CHECK (session_hash ~ '^[a-f0-9]{64}$'),
  path text NOT NULL CHECK (path ~ '^/[A-Za-z0-9/_-]*$'),
  conversion_key text,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT website_analytics_events_website_org_fk FOREIGN KEY (organization_id, website_id)
    REFERENCES websites(organization_id, id) ON DELETE CASCADE,
  CONSTRAINT website_analytics_events_conversion_ck CHECK (
    (event_name = 'form_submit' AND conversion_key IS NOT NULL)
    OR (event_name <> 'form_submit' AND conversion_key IS NULL)
  )
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS website_analytics_events_org_id_id_uq ON website_analytics_events(organization_id, id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS website_analytics_events_org_website_time_idx
  ON website_analytics_events(organization_id, website_id, occurred_at);
--> statement-breakpoint
ALTER TABLE website_analytics_events ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS website_analytics_events_tenant_isolation ON website_analytics_events;
--> statement-breakpoint
CREATE POLICY website_analytics_events_tenant_isolation ON website_analytics_events
  USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);
