-- Phase 16: tenant-scoped Commerce primitives. All money is integer minor units.
CREATE TABLE commerce_products (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, website_id uuid NOT NULL,
 sku text NOT NULL, slug text NOT NULL, name text NOT NULL, description text NOT NULL DEFAULT '',
 currency text NOT NULL DEFAULT 'NGN', unit_amount_minor bigint NOT NULL CHECK(unit_amount_minor >= 0),
 inventory_quantity integer CHECK(inventory_quantity IS NULL OR inventory_quantity >= 0),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','archived')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT commerce_products_website_org_fk FOREIGN KEY(organization_id,website_id) REFERENCES websites(organization_id,id) ON DELETE CASCADE,
 CONSTRAINT commerce_products_sku_uq UNIQUE(organization_id,website_id,sku),
 CONSTRAINT commerce_products_slug_uq UNIQUE(organization_id,website_id,slug),
 CONSTRAINT commerce_products_id_uq UNIQUE(organization_id,website_id,id)
);
--> statement-breakpoint
CREATE INDEX commerce_products_public_idx ON commerce_products(website_id,status);
--> statement-breakpoint
CREATE TABLE commerce_carts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, website_id uuid NOT NULL,
 customer_key_hash text NOT NULL, user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
 currency text NOT NULL DEFAULT 'NGN', status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','converted','abandoned')),
 expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT commerce_carts_website_org_fk FOREIGN KEY(organization_id,website_id) REFERENCES websites(organization_id,id) ON DELETE CASCADE,
 CONSTRAINT commerce_carts_id_uq UNIQUE(organization_id,website_id,id)
);
--> statement-breakpoint
CREATE UNIQUE INDEX commerce_carts_active_uq ON commerce_carts(organization_id,website_id,customer_key_hash) WHERE status='active';
--> statement-breakpoint
CREATE TABLE commerce_cart_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, website_id uuid NOT NULL, cart_id uuid NOT NULL,
 product_id uuid NOT NULL, quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 99),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT commerce_cart_items_cart_fk FOREIGN KEY(organization_id,website_id,cart_id) REFERENCES commerce_carts(organization_id,website_id,id) ON DELETE CASCADE,
 CONSTRAINT commerce_cart_items_product_fk FOREIGN KEY(organization_id,website_id,product_id) REFERENCES commerce_products(organization_id,website_id,id) ON DELETE RESTRICT,
 CONSTRAINT commerce_cart_items_product_uq UNIQUE(cart_id,product_id)
);
--> statement-breakpoint
CREATE TABLE commerce_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, website_id uuid NOT NULL, order_number text NOT NULL,
 customer_key_hash text NOT NULL, customer_email text NOT NULL, currency text NOT NULL,
 subtotal_minor bigint NOT NULL CHECK(subtotal_minor >= 0), shipping_minor bigint NOT NULL DEFAULT 0 CHECK(shipping_minor >= 0),
 tax_minor bigint NOT NULL DEFAULT 0 CHECK(tax_minor >= 0), total_minor bigint NOT NULL CHECK(total_minor >= 0),
 status text NOT NULL DEFAULT 'pending_payment' CHECK(status IN ('pending_payment','processing','fulfilled','cancelled','refunded')),
 payment_status text NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid','pending','paid','failed','refunded')),
 snapshot_version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT commerce_orders_website_org_fk FOREIGN KEY(organization_id,website_id) REFERENCES websites(organization_id,id) ON DELETE RESTRICT,
 CONSTRAINT commerce_orders_number_uq UNIQUE(organization_id,order_number),
 CONSTRAINT commerce_orders_id_uq UNIQUE(organization_id,website_id,id),
 CONSTRAINT commerce_orders_total_check CHECK(total_minor = subtotal_minor + shipping_minor + tax_minor)
);
--> statement-breakpoint
CREATE INDEX commerce_orders_site_created_idx ON commerce_orders(organization_id,website_id,created_at DESC);
--> statement-breakpoint
CREATE TABLE commerce_order_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, website_id uuid NOT NULL, order_id uuid NOT NULL,
 product_id uuid, product_name text NOT NULL, sku text NOT NULL, quantity integer NOT NULL CHECK(quantity > 0),
 unit_amount_minor bigint NOT NULL CHECK(unit_amount_minor >= 0), line_total_minor bigint NOT NULL CHECK(line_total_minor = unit_amount_minor * quantity),
 currency text NOT NULL, snapshot jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT commerce_order_items_order_fk FOREIGN KEY(organization_id,website_id,order_id) REFERENCES commerce_orders(organization_id,website_id,id) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE INDEX commerce_order_items_order_idx ON commerce_order_items(order_id);
--> statement-breakpoint
-- Snapshots are append-only; even tenant administrators cannot rewrite what was purchased.
CREATE FUNCTION commerce_reject_order_item_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'commerce order item snapshots are immutable' USING ERRCODE='55000'; END; $$;
--> statement-breakpoint
CREATE TRIGGER commerce_order_items_immutable BEFORE UPDATE OR DELETE ON commerce_order_items FOR EACH ROW EXECUTE FUNCTION commerce_reject_order_item_mutation();
--> statement-breakpoint
CREATE TABLE commerce_payment_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, website_id uuid NOT NULL, order_id uuid NOT NULL,
 provider text NOT NULL DEFAULT 'paystack', reference text NOT NULL, transaction_id text,
 amount_minor bigint NOT NULL CHECK(amount_minor > 0), currency text NOT NULL,
 status text NOT NULL DEFAULT 'initialized' CHECK(status IN ('initialized','pending','success','failed')),
 checkout_url text, verified_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT commerce_payment_attempts_order_fk FOREIGN KEY(organization_id,website_id,order_id) REFERENCES commerce_orders(organization_id,website_id,id) ON DELETE RESTRICT,
 CONSTRAINT commerce_payment_reference_uq UNIQUE(provider,reference)
);
--> statement-breakpoint
CREATE UNIQUE INDEX commerce_payment_transaction_uq ON commerce_payment_attempts(provider,transaction_id) WHERE transaction_id IS NOT NULL;
--> statement-breakpoint
CREATE TABLE commerce_webhook_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider text NOT NULL, event_key text NOT NULL, reference text NOT NULL,
 payload_hash text NOT NULL, status text NOT NULL DEFAULT 'received' CHECK(status IN ('received','processed','ignored','failed')),
 received_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz,
 CONSTRAINT commerce_webhook_event_uq UNIQUE(provider,event_key)
);
--> statement-breakpoint
CREATE INDEX commerce_webhook_reference_idx ON commerce_webhook_events(reference,received_at);
--> statement-breakpoint
-- Tenant isolation for all tenant-owned records. Public access must use the verified host resolver.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['commerce_products','commerce_carts','commerce_cart_items','commerce_orders','commerce_order_items','commerce_payment_attempts'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY %I ON %I USING (organization_id = NULLIF(current_setting(''app.current_organization_id'',true),'''')::uuid) WITH CHECK (organization_id = NULLIF(current_setting(''app.current_organization_id'',true),'''')::uuid)',t||'_tenant_isolation',t);
 END LOOP;
END $$;
