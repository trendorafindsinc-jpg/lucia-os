-- Narrow SECURITY DEFINER lookup functions let the public renderer resolve only published sites
-- without granting the application role cross-tenant SELECT access to tenant-owned tables.
CREATE OR REPLACE FUNCTION public.resolve_public_website_by_slug(input_slug text)
RETURNS TABLE (id uuid, organization_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT w.id, w.organization_id
  FROM public.websites AS w
  WHERE w.slug = input_slug
    AND w.status = 'published'
  LIMIT 1
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.resolve_public_website_by_hostname(input_hostname text)
RETURNS TABLE (id uuid, organization_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT d.website_id AS id, d.organization_id
  FROM public.website_domains AS d
  INNER JOIN public.websites AS w
    ON w.id = d.website_id
   AND w.organization_id = d.organization_id
  WHERE d.hostname = input_hostname
    AND d.status = 'active'
    AND w.status = 'published'
  LIMIT 1
$$;
