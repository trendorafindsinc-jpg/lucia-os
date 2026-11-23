-- Commerce catalogue foundation. Additive only; no existing website or customer data is changed.
CREATE TABLE commerce_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  website_id uuid NOT NULL,
  created_by_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 180),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' AND length(slug) <= 180),
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  price_minor bigint NOT NULL CHECK (price_minor >= 0),
  compare_at_price_minor bigint CHECK (compare_at_price_minor IS NULL OR compare_at_price_minor >= price_minor),
  featured_media_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commerce_products_website_org_fk
    FOREIGN KEY (organization_id,website_id) REFERENCES websites(organization_id,id) ON DELETE CASCADE,
  CONSTRAINT commerce_products_featured_media_fk
    FOREIGN KEY (organization_id,website_id,featured_media_id)
    REFERENCES website_media(organization_id,website_id,id) ON DELETE RESTRICT,
  CONSTRAINT commerce_products_org_site_id_uq UNIQUE(organization_id,website_id,id),
  CONSTRAINT commerce_products_currency_price_ck CHECK(compare_at_price_minor IS NULL OR compare_at_price_minor >= price_minor)
);
--> statement-breakpoint
CREATE UNIQUE INDEX commerce_products_site_slug_uq ON commerce_products(organization_id,website_id,slug);
CREATE INDEX commerce_products_site_status_updated_idx ON commerce_products(organization_id,website_id,status,updated_at DESC);
--> statement-breakpoint
CREATE TABLE commerce_product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  website_id uuid NOT NULL,
  product_id uuid NOT NULL,
  sku text CHECK (sku IS NULL OR length(btrim(sku)) BETWEEN 1 AND 100),
  options jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(options)='object'),
  price_minor bigint CHECK (price_minor IS NULL OR price_minor >= 0),
  compare_at_price_minor bigint,
  track_inventory boolean NOT NULL DEFAULT false,
  inventory_quantity integer NOT NULL DEFAULT 0 CHECK (inventory_quantity >= 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commerce_product_variants_product_scope_fk
    FOREIGN KEY (organization_id,website_id,product_id)
    REFERENCES commerce_products(organization_id,website_id,id) ON DELETE CASCADE,
  CONSTRAINT commerce_product_variants_compare_price_ck
    CHECK(compare_at_price_minor IS NULL OR (compare_at_price_minor >= 0 AND (price_minor IS NULL OR compare_at_price_minor >= price_minor))),
  CONSTRAINT commerce_product_variants_org_site_id_uq UNIQUE(organization_id,website_id,id)
);
--> statement-breakpoint
CREATE UNIQUE INDEX commerce_product_variants_product_sku_uq
 ON commerce_product_variants(product_id,sku) WHERE sku IS NOT NULL;
CREATE INDEX commerce_product_variants_product_status_idx
 ON commerce_product_variants(organization_id,website_id,product_id,status);
--> statement-breakpoint
CREATE TABLE commerce_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  website_id uuid NOT NULL,
  name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 100),
  slug text NOT NULL CHECK(slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' AND length(slug) <= 120),
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commerce_categories_website_org_fk
    FOREIGN KEY (organization_id,website_id) REFERENCES websites(organization_id,id) ON DELETE CASCADE,
  CONSTRAINT commerce_categories_org_site_id_uq UNIQUE(organization_id,website_id,id)
);
--> statement-breakpoint
CREATE UNIQUE INDEX commerce_categories_site_slug_uq ON commerce_categories(organization_id,website_id,slug);
--> statement-breakpoint
CREATE TABLE commerce_product_categories (
  organization_id uuid NOT NULL,
  website_id uuid NOT NULL,
  product_id uuid NOT NULL,
  category_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commerce_product_categories_pk PRIMARY KEY(product_id,category_id),
  CONSTRAINT commerce_product_categories_product_scope_fk
    FOREIGN KEY (organization_id,website_id,product_id)
    REFERENCES commerce_products(organization_id,website_id,id) ON DELETE CASCADE,
  CONSTRAINT commerce_product_categories_category_scope_fk
    FOREIGN KEY (organization_id,website_id,category_id)
    REFERENCES commerce_categories(organization_id,website_id,id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX commerce_product_categories_category_idx ON commerce_product_categories(organization_id,website_id,category_id);
--> statement-breakpoint
CREATE TABLE commerce_product_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  website_id uuid NOT NULL,
  product_id uuid NOT NULL,
  media_id uuid NOT NULL,
  sort_order integer NOT NULL DEFAULT 0 CHECK(sort_order >= 0),
  alt text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commerce_product_media_product_scope_fk
    FOREIGN KEY (organization_id,website_id,product_id)
    REFERENCES commerce_products(organization_id,website_id,id) ON DELETE CASCADE,
  CONSTRAINT commerce_product_media_asset_scope_fk
    FOREIGN KEY (organization_id,website_id,media_id)
    REFERENCES website_media(organization_id,website_id,id) ON DELETE RESTRICT,
  CONSTRAINT commerce_product_media_product_asset_uq UNIQUE(product_id,media_id)
);
--> statement-breakpoint
CREATE INDEX commerce_product_media_product_order_idx ON commerce_product_media(product_id,sort_order);
--> statement-breakpoint
-- All catalogue records are private to active organization members. Public storefront
-- reads will be added only through a host-bound published-product access policy.
DO $$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['commerce_products','commerce_product_variants','commerce_categories','commerce_product_categories','commerce_product_media'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (
    organization_id = NULLIF(current_setting(''app.current_organization_id'',true),'''')::uuid
    AND EXISTS (
      SELECT 1 FROM organization_memberships m
      JOIN organizations o ON o.id=m.organization_id
      WHERE m.organization_id=%I.organization_id
        AND m.user_id=NULLIF(current_setting(''app.current_user_id'',true),'''')::uuid
        AND m.status=''active'' AND o.status=''active''
        AND m.role IN (''owner'',''admin'',''editor'')
    )
  ) WITH CHECK (
    organization_id = NULLIF(current_setting(''app.current_organization_id'',true),'''')::uuid
    AND EXISTS (
      SELECT 1 FROM organization_memberships m
      JOIN organizations o ON o.id=m.organization_id
      WHERE m.organization_id=%I.organization_id
        AND m.user_id=NULLIF(current_setting(''app.current_user_id'',true),'''')::uuid
        AND m.status=''active'' AND o.status=''active''
        AND m.role IN (''owner'',''admin'',''editor'')
    )
  )',t||'_member_manage',t,t,t);
 END LOOP;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='lucia_os_runtime') THEN
  GRANT SELECT,INSERT,UPDATE ON commerce_products,commerce_product_variants,commerce_categories TO lucia_os_runtime;
  GRANT SELECT,INSERT,DELETE ON commerce_product_categories,commerce_product_media TO lucia_os_runtime;
 END IF;
END $$;
