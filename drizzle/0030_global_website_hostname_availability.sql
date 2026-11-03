-- Phase 15: return a safe global availability boolean without exposing other tenants' rows.
-- The function is SECURITY DEFINER because pending domain claims are intentionally
-- hidden from ordinary tenants by RLS. Only a boolean leaves the privileged query.
CREATE OR REPLACE FUNCTION public.lucia_website_hostname_available(
  requested_hostname text,
  excluded_website_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path=pg_catalog,public
SET row_security=off
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.website_domains AS domain
    WHERE domain.hostname = lower(trim(requested_hostname))
      AND domain.status <> 'removed'
      AND (excluded_website_id IS NULL OR domain.website_id <> excluded_website_id)
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.websites AS website
    WHERE website.slug = split_part(lower(trim(requested_hostname)), '.', 1)
      AND website.status <> 'deleted'
      AND (excluded_website_id IS NULL OR website.id <> excluded_website_id)
  );
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.lucia_website_hostname_available(text,uuid) FROM PUBLIC;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='lucia_os_runtime') THEN
    GRANT EXECUTE ON FUNCTION public.lucia_website_hostname_available(text,uuid) TO lucia_os_runtime;
  END IF;
END $$;
