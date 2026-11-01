-- Phase 1: globally unique website hostnames and verified custom-domain ownership.
-- DNS reaching this deployment does not itself authorize a hostname to serve a website.
CREATE UNIQUE INDEX IF NOT EXISTS "websites_org_id_id_uq"
  ON "websites" ("organization_id", "id");

CREATE TABLE IF NOT EXISTS "website_domains" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations" ("id") ON DELETE RESTRICT,
  "website_id" uuid NOT NULL,
  "hostname" text NOT NULL,
  "domain_type" text NOT NULL CHECK ("domain_type" IN ('lucia_subdomain', 'custom')),
  "status" text NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'verifying', 'verified', 'active', 'suspended', 'removed')),
  "is_primary" boolean NOT NULL DEFAULT false,
  "verification_token_hash" text,
  "verified_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "website_domains_hostname_format_ck" CHECK (
    "hostname" = lower(trim("hostname"))
    AND length("hostname") BETWEEN 3 AND 253
    AND "hostname" ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'
  ),
  CONSTRAINT "website_domains_website_org_fk"
    FOREIGN KEY ("organization_id", "website_id")
    REFERENCES "websites" ("organization_id", "id") ON DELETE CASCADE,
  CONSTRAINT "website_domains_verification_state_ck" CHECK (
    ("status" NOT IN ('verified', 'active') OR "verified_at" IS NOT NULL)
  )
);

-- A hostname can belong to exactly one website across the whole platform.
CREATE UNIQUE INDEX IF NOT EXISTS "website_domains_hostname_uq"
  ON "website_domains" ("hostname");
CREATE UNIQUE INDEX IF NOT EXISTS "website_domains_one_lucia_subdomain_per_site_uq"
  ON "website_domains" ("organization_id", "website_id")
  WHERE "domain_type" = 'lucia_subdomain' AND "status" <> 'removed';
CREATE UNIQUE INDEX IF NOT EXISTS "website_domains_one_primary_per_site_uq"
  ON "website_domains" ("organization_id", "website_id")
  WHERE "is_primary" = true AND "status" <> 'removed';
CREATE INDEX IF NOT EXISTS "website_domains_org_status_idx"
  ON "website_domains" ("organization_id", "status");
CREATE INDEX IF NOT EXISTS "website_domains_active_hostname_idx"
  ON "website_domains" ("hostname") WHERE "status" = 'active';

ALTER TABLE "website_domains" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "website_domains_tenant_isolation" ON "website_domains"
  USING ("organization_id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);

-- Public routing can resolve only active hostnames; pending and removed claims
-- remain private to the owning tenant. Published-site/page policies still gate
-- the actual rendered content.
CREATE POLICY "website_domains_public_active_read" ON "website_domains"
  FOR SELECT USING ("status" = 'active');
