-- Phase 20: tenant-scoped billing ledger foundation.
-- This migration defines storage only; it does not expose checkout/webhook routes
-- or authorize fulfillment. Provider-side transaction verification is still required.
CREATE TABLE IF NOT EXISTS "billing_invoices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
  "invoice_number" text NOT NULL,
  "amount_due_minor" bigint NOT NULL CHECK ("amount_due_minor" > 0),
  "amount_paid_minor" bigint NOT NULL DEFAULT 0 CHECK ("amount_paid_minor" >= 0),
  "currency" text NOT NULL CHECK ("currency" ~ '^[A-Z]{3}$'),
  "status" text NOT NULL DEFAULT 'open' CHECK ("status" IN ('draft','open','paid','void','overdue')),
  "due_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "billing_invoices_org_number_uq" UNIQUE ("organization_id", "invoice_number"),
  CONSTRAINT "billing_invoices_paid_not_over_due" CHECK ("amount_paid_minor" <= "amount_due_minor")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "billing_invoices_org_status_created_idx" ON "billing_invoices" ("organization_id", "status", "created_at" DESC);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "billing_payment_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
  "invoice_id" uuid NOT NULL REFERENCES "billing_invoices"("id") ON DELETE RESTRICT,
  "provider" text NOT NULL CHECK ("provider" IN ('paystack','flutterwave')),
  "provider_reference" text NOT NULL,
  "provider_transaction_id" text,
  "idempotency_key" text NOT NULL,
  "amount_minor" bigint NOT NULL CHECK ("amount_minor" > 0),
  "currency" text NOT NULL CHECK ("currency" ~ '^[A-Z]{3}$'),
  "status" text NOT NULL DEFAULT 'initialized' CHECK ("status" IN ('initialized','pending','succeeded','failed','cancelled')),
  "checkout_url" text,
  "verified_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "billing_payment_attempts_org_provider_reference_uq" UNIQUE ("organization_id", "provider", "provider_reference"),
  CONSTRAINT "billing_payment_attempts_org_idempotency_uq" UNIQUE ("organization_id", "idempotency_key"),
  CONSTRAINT "billing_payment_attempts_org_id_id_uq" UNIQUE ("organization_id", "id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "billing_payment_attempts_provider_txn_uq" ON "billing_payment_attempts" ("provider", "provider_transaction_id") WHERE "provider_transaction_id" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "billing_payment_attempts_org_invoice_created_idx" ON "billing_payment_attempts" ("organization_id", "invoice_id", "created_at" DESC);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "billing_webhook_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
  "payment_attempt_id" uuid NOT NULL,
  "provider" text NOT NULL CHECK ("provider" IN ('paystack','flutterwave')),
  "provider_event_id" text NOT NULL,
  "event_type" text NOT NULL,
  "payload_sha256" text NOT NULL CHECK ("payload_sha256" ~ '^[a-f0-9]{64}$'),
  "processing_status" text NOT NULL DEFAULT 'received' CHECK ("processing_status" IN ('received','processed','ignored','failed')),
  "received_at" timestamptz NOT NULL DEFAULT now(),
  "processed_at" timestamptz,
  CONSTRAINT "billing_webhook_events_org_provider_event_uq" UNIQUE ("organization_id", "provider", "provider_event_id"),
  CONSTRAINT "billing_webhook_events_attempt_org_fk" FOREIGN KEY ("organization_id", "payment_attempt_id") REFERENCES "billing_payment_attempts"("organization_id", "id") ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "billing_webhook_events_org_status_received_idx" ON "billing_webhook_events" ("organization_id", "processing_status", "received_at" DESC);
--> statement-breakpoint
ALTER TABLE "billing_invoices" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "billing_payment_attempts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "billing_webhook_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "billing_invoices_tenant_isolation" ON "billing_invoices"
  USING ("organization_id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "billing_payment_attempts_tenant_isolation" ON "billing_payment_attempts"
  USING ("organization_id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "billing_webhook_events_tenant_isolation" ON "billing_webhook_events"
  USING ("organization_id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);
