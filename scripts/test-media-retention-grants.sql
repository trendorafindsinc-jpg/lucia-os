DO $$
BEGIN
  IF NOT has_table_privilege('lucia_os_runtime', 'public.website_pages', 'SELECT,UPDATE') THEN
    RAISE EXCEPTION 'lucia_os_runtime must be able to SELECT and lock website_pages rows for media retention checks';
  END IF;
  IF NOT has_table_privilege('lucia_os_runtime', 'public.website_versions', 'SELECT') THEN
    RAISE EXCEPTION 'lucia_os_runtime must be able to read website_versions for media retention checks';
  END IF;
  IF NOT has_table_privilege('lucia_os_runtime', 'public.website_domains', 'SELECT') THEN
    RAISE EXCEPTION 'lucia_os_runtime must be able to read website_domains for article RLS policy evaluation';
  END IF;
END $$;
