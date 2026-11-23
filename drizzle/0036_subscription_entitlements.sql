-- Phase 6: persisted plan catalog, organization subscriptions and feature entitlements.
-- No customer subscriptions are backfilled and no existing billing records are changed.
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key text NOT NULL CHECK (plan_key ~ '^[a-z0-9_-]{1,60}$'),
  product_key text NOT NULL DEFAULT 'lucia_os' CHECK (product_key ~ '^[a-z0-9_-]{1,60}$'),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 100),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscription_plans_product_key_uq UNIQUE(product_key, plan_key)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS subscription_plan_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  entitlement_key text NOT NULL CHECK (entitlement_key ~ '^[a-z][a-z0-9_.-]{1,79}$'),
  value jsonb NOT NULL DEFAULT '{"enabled":true}'::jsonb CHECK (jsonb_typeof(value)='object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscription_plan_entitlements_plan_key_uq UNIQUE(plan_id, entitlement_key)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS organization_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  plan_id uuid NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing','active','past_due','cancelled','expired')),
  cadence text NOT NULL DEFAULT 'monthly' CHECK (cadence IN ('weekly','monthly','annual')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  current_period_ends_at timestamptz,
  trial_ends_at timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  provider text CHECK (provider IS NULL OR provider IN ('paystack','flutterwave')),
  provider_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_subscriptions_org_id_id_uq UNIQUE(organization_id,id),
  CONSTRAINT organization_subscriptions_period_ck CHECK(current_period_ends_at IS NULL OR current_period_ends_at > starts_at),
  CONSTRAINT organization_subscriptions_trial_ck CHECK(trial_ends_at IS NULL OR trial_ends_at > starts_at)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS organization_subscriptions_provider_reference_uq
 ON organization_subscriptions(provider,provider_reference) WHERE provider_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS organization_subscriptions_org_status_idx
 ON organization_subscriptions(organization_id,status);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS organization_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  subscription_id uuid,
  entitlement_key text NOT NULL CHECK (entitlement_key ~ '^[a-z][a-z0-9_.-]{1,79}$'),
  value jsonb NOT NULL DEFAULT '{"enabled":true}'::jsonb CHECK (jsonb_typeof(value)='object'),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','revoked','expired')),
  effective_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_entitlements_subscription_org_fk
    FOREIGN KEY(organization_id,subscription_id)
    REFERENCES organization_subscriptions(organization_id,id) ON DELETE RESTRICT,
  CONSTRAINT organization_entitlements_expiry_ck CHECK(expires_at IS NULL OR expires_at > effective_at)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS organization_entitlements_org_key_subscription_uq
 ON organization_entitlements(organization_id,entitlement_key,subscription_id)
 WHERE subscription_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS organization_entitlements_org_key_manual_uq
 ON organization_entitlements(organization_id,entitlement_key)
 WHERE subscription_id IS NULL;
CREATE INDEX IF NOT EXISTS organization_entitlements_org_key_status_idx
 ON organization_entitlements(organization_id,entitlement_key,status);
--> statement-breakpoint
ALTER TABLE organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE organization_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_entitlements FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY organization_subscriptions_tenant_isolation ON organization_subscriptions
 USING (organization_id=NULLIF(current_setting('app.current_organization_id',true),'')::uuid)
 WITH CHECK (organization_id=NULLIF(current_setting('app.current_organization_id',true),'')::uuid);
CREATE POLICY organization_entitlements_tenant_isolation ON organization_entitlements
 USING (organization_id=NULLIF(current_setting('app.current_organization_id',true),'')::uuid)
 WITH CHECK (organization_id=NULLIF(current_setting('app.current_organization_id',true),'')::uuid);
--> statement-breakpoint
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plan_entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY subscription_plans_active_catalog_read ON subscription_plans FOR SELECT USING(active=true);
CREATE POLICY subscription_plan_entitlements_catalog_read ON subscription_plan_entitlements FOR SELECT USING(
 EXISTS(SELECT 1 FROM subscription_plans p WHERE p.id=plan_id AND p.active=true)
);
--> statement-breakpoint
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='lucia_os_runtime') THEN
  GRANT SELECT ON subscription_plans,subscription_plan_entitlements TO lucia_os_runtime;
  GRANT SELECT,INSERT,UPDATE ON organization_subscriptions,organization_entitlements TO lucia_os_runtime;
 END IF;
END $$;
