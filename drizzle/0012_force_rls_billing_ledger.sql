-- Phase 20 hardening: ensure table owners are subject to tenant policies too.
-- Superusers and roles explicitly granted BYPASSRLS still bypass RLS; application
-- connections must use a non-owner NOBYPASSRLS role and be tested as that role.
ALTER TABLE "billing_invoices" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "billing_payment_attempts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "billing_webhook_events" FORCE ROW LEVEL SECURITY;
