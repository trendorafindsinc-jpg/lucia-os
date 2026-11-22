-- Media retention checks read legacy drafts/recovery versions as well as graph references.
-- Grant only the SELECT privileges required by the existing tenant-scoped policies.
-- This is additive and does not modify any customer rows.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lucia_os_runtime') THEN
    GRANT SELECT ON website_pages, website_versions TO lucia_os_runtime;
  END IF;
END $$;
