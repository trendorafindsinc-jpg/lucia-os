-- Article visibility policies bind public content to an active website hostname.
-- Tenant-scoped media retention queries that inspect article references therefore
-- require SELECT on this RLS-protected table as well.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lucia_os_runtime') THEN
    EXECUTE 'GRANT SELECT ON TABLE public.website_domains TO lucia_os_runtime';
  END IF;
END $$;
