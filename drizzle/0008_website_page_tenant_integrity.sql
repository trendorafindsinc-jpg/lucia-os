-- Phase 2: ensure each page belongs to the same organization as its website.
-- Preflight deliberately fails rather than silently reassigning or deleting existing data.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM website_pages AS page
    LEFT JOIN websites AS website
      ON website.id = page.website_id
     AND website.organization_id = page.organization_id
    WHERE website.id IS NULL
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce website page tenant ownership: mismatched or missing website ownership exists in website_pages';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "website_pages"
  ADD CONSTRAINT "website_pages_website_org_fk"
  FOREIGN KEY ("organization_id", "website_id")
  REFERENCES "websites" ("organization_id", "id")
  ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "website_pages"
  DROP CONSTRAINT IF EXISTS "website_pages_website_id_fkey";
