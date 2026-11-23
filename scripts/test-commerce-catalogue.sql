DO $$
DECLARE
  required_table text;
BEGIN
  FOREACH required_table IN ARRAY ARRAY[
    'commerce_products','commerce_product_variants','commerce_categories',
    'commerce_product_categories','commerce_product_media'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=required_table
        AND c.relrowsecurity AND c.relforcerowsecurity
    ) THEN
      RAISE EXCEPTION 'Commerce table % must enable and force row-level security', required_table;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname=required_table||'_member_manage') THEN
      RAISE EXCEPTION 'Missing tenant member policy for %', required_table;
    END IF;
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='commerce_products_website_org_fk') OR
     NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='commerce_products_featured_media_fk') OR
     NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='commerce_product_variants_product_scope_fk') OR
     NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='commerce_product_categories_category_scope_fk') OR
     NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='commerce_product_media_asset_scope_fk') THEN
    RAISE EXCEPTION 'Commerce catalogue is missing a tenant-scoped website/product/media relationship';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid IN (
      'public.commerce_products'::regclass,
      'public.commerce_product_variants'::regclass,
      'public.commerce_categories'::regclass,
      'public.commerce_product_categories'::regclass,
      'public.commerce_product_media'::regclass
    )
    AND polname NOT LIKE '%_member_manage'
  ) THEN
    RAISE EXCEPTION 'Unexpected Commerce policy bypasses the member-scoped catalogue contract';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='lucia_os_runtime') THEN
    IF NOT has_table_privilege('lucia_os_runtime','public.commerce_products','SELECT,INSERT,UPDATE')
      OR NOT has_table_privilege('lucia_os_runtime','public.commerce_product_variants','SELECT,INSERT,UPDATE')
      OR NOT has_table_privilege('lucia_os_runtime','public.commerce_categories','SELECT,INSERT,UPDATE')
      OR NOT has_table_privilege('lucia_os_runtime','public.commerce_product_categories','SELECT,INSERT,DELETE')
      OR NOT has_table_privilege('lucia_os_runtime','public.commerce_product_media','SELECT,INSERT,DELETE') THEN
      RAISE EXCEPTION 'Commerce runtime catalogue privileges are incomplete';
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM subscription_plans p
    JOIN subscription_plan_entitlements e ON e.plan_id=p.id
    WHERE p.product_key='lucia_os' AND p.plan_key='starter_trial'
      AND e.entitlement_key='commerce' AND e.value->>'enabled'='false'
  ) THEN
    RAISE EXCEPTION 'Commerce must remain disabled for the existing starter trial';
  END IF;
END $$;
