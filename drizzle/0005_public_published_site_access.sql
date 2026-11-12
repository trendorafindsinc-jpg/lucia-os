-- Repair public read access for published customer websites after database branch changes.
-- Public access is limited to published website records and published page snapshots.
ALTER TABLE "websites" ADD COLUMN IF NOT EXISTS "published_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "website_pages" ADD COLUMN IF NOT EXISTS "published_content" text;
--> statement-breakpoint
DROP POLICY IF EXISTS "websites_public_published_read" ON "websites";
--> statement-breakpoint
CREATE POLICY "websites_public_published_read" ON "websites"
  FOR SELECT USING ("status" = 'published');
--> statement-breakpoint
DROP POLICY IF EXISTS "website_pages_public_published_read" ON "website_pages";
--> statement-breakpoint
CREATE POLICY "website_pages_public_published_read" ON "website_pages"
  FOR SELECT USING (
    "status" = 'published'
    AND "published_content" IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM "websites" AS published_website
      WHERE published_website."id" = "website_pages"."website_id"
        AND published_website."organization_id" = "website_pages"."organization_id"
        AND published_website."status" = 'published'
    )
  );
