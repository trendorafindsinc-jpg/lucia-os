CREATE OR REPLACE VIEW loom_public_authors AS
SELECT id, display_name, active
FROM app_users;

GRANT SELECT ON loom_public_authors TO lucia_os_runtime;
