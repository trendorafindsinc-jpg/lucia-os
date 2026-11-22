-- The media deletion transaction takes a row lock on the legacy root page
-- before checking drafts and recovery versions. SELECT FOR UPDATE requires
-- SELECT and UPDATE privileges even though the row is not modified.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lucia_os_runtime') THEN
    EXECUTE 'GRANT SELECT, UPDATE ON TABLE public.website_pages TO lucia_os_runtime';
    EXECUTE 'GRANT SELECT ON TABLE public.website_versions TO lucia_os_runtime';
  END IF;
END $$;
