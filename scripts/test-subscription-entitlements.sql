DO $$
DECLARE
  required_table text;
  required_policy text;
BEGIN
  FOREACH required_table IN ARRAY ARRAY[
    'subscription_plans','subscription_plan_entitlements',
    'organization_subscriptions','organization_entitlements'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=required_table AND c.relrowsecurity
    ) THEN RAISE EXCEPTION 'RLS is not enabled on %', required_table; END IF;
  END LOOP;
  IF NOT (SELECT relforcerowsecurity FROM pg_class WHERE oid='public.organization_subscriptions'::regclass)
    OR NOT (SELECT relforcerowsecurity FROM pg_class WHERE oid='public.organization_entitlements'::regclass)
  THEN RAISE EXCEPTION 'Tenant subscription and entitlement tables must FORCE RLS'; END IF;
  FOREACH required_policy IN ARRAY ARRAY[
    'organization_subscriptions_tenant_isolation',
    'organization_entitlements_tenant_isolation',
    'subscription_plans_active_catalog_read',
    'subscription_plan_entitlements_catalog_read'
  ] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname=required_policy) THEN
      RAISE EXCEPTION 'Missing subscription entitlement policy %', required_policy;
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='lucia_os_runtime') THEN
    IF NOT has_table_privilege('lucia_os_runtime','public.organization_subscriptions','SELECT,INSERT,UPDATE')
      OR NOT has_table_privilege('lucia_os_runtime','public.organization_entitlements','SELECT,INSERT,UPDATE')
      OR NOT has_table_privilege('lucia_os_runtime','public.subscription_plans','SELECT')
    THEN RAISE EXCEPTION 'Runtime subscription entitlement privileges are incomplete'; END IF;
  END IF;
END $$;
