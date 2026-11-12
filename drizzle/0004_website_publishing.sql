-- Phase 14: immutable published snapshots and wildcard subdomain rendering.
ALTER TABLE "websites" ADD COLUMN IF NOT EXISTS "published_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "website_pages" ADD COLUMN IF NOT EXISTS "published_content" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "websites_published_slug_uq"
  ON "websites" ("slug")
  WHERE "status" = 'published';
--> statement-breakpoint
CREATE POLICY "websites_public_published_read" ON "websites"
  FOR SELECT USING ("status" = 'published');
--> statement-breakpoint
CREATE POLICY "website_pages_public_published_read" ON "website_pages"
  FOR SELECT USING (
    "status" = 'published'
    AND EXISTS (
      SELECT 1 FROM "websites" AS published_website
      WHERE published_website."id" = "website_pages"."website_id"
        AND published_website."organization_id" = "website_pages"."organization_id"
        AND published_website."status" = 'published'
    )
  );
