-- Disposable PostgreSQL integration checks for Graph Engine RLS and tenant FKs.
-- Run only after all migrations have been applied to a fresh CI database.
GRANT USAGE ON SCHEMA public TO lucia_os_runtime;
GRANT SELECT ON app_users, organizations, organization_memberships, websites TO lucia_os_runtime;

INSERT INTO app_users (id, core_subject_id, display_name) VALUES
  ('10000000-0000-4000-8000-000000000001', 'graph-ci-viewer', 'Graph CI Viewer'),
  ('10000000-0000-4000-8000-000000000002', 'graph-ci-editor', 'Graph CI Editor'),
  ('20000000-0000-4000-8000-000000000001', 'graph-ci-other-tenant', 'Graph CI Other Tenant');

INSERT INTO organizations (id, name, slug, status) VALUES
  ('30000000-0000-4000-8000-000000000001', 'Graph CI Tenant A', 'graph-ci-tenant-a', 'active'),
  ('30000000-0000-4000-8000-000000000002', 'Graph CI Tenant B', 'graph-ci-tenant-b', 'active');

INSERT INTO organization_memberships (id, organization_id, user_id, role, status) VALUES
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'viewer', 'active'),
  ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'editor', 'active'),
  ('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'editor', 'active');

INSERT INTO websites (id, organization_id, name, slug, status) VALUES
  ('50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Graph CI Site A', 'graph-ci-site-a', 'draft'),
  ('50000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'Graph CI Site B', 'graph-ci-site-b', 'draft');

INSERT INTO website_graphs (id, organization_id, website_id, schema_version, draft_revision) VALUES
  ('60000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 1, 0),
  ('60000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', 1, 0);

INSERT INTO website_nodes (id, organization_id, website_id, graph_id, node_type, schema_version, properties) VALUES
  ('70000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 'website', 1, '{"name":"Tenant A"}'),
  ('70000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000002', 'website', 1, '{"name":"Tenant B"}');

INSERT INTO website_graph_versions (id, organization_id, website_id, graph_id, revision, schema_version, snapshot, content_hash, created_by_user_id) VALUES
  ('80000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 0, 1, '{"nodes":[],"edges":[]}', repeat('a', 64), '10000000-0000-4000-8000-000000000002'),
  ('80000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000002', 0, 1, '{"nodes":[],"edges":[]}', repeat('b', 64), '20000000-0000-4000-8000-000000000001');

INSERT INTO website_canvas_positions (id, organization_id, website_id, graph_id, user_id, node_id, x, y, locked) VALUES
  ('90000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', 10, 20, false),
  ('90000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000001', 30, 40, true);

-- A tenant viewer can read their tenant and update only their own canvas state.
SET ROLE lucia_os_runtime;
SELECT set_config('app.current_user_id', '10000000-0000-4000-8000-000000000001', false);
SELECT set_config('app.current_organization_id', '30000000-0000-4000-8000-000000000001', false);
DO $$
DECLARE visible_count integer;
BEGIN
  SELECT count(*) INTO visible_count FROM website_graphs;
  IF visible_count <> 1 THEN RAISE EXCEPTION 'Tenant A graph visibility failed: %', visible_count; END IF;
  SELECT count(*) INTO visible_count FROM website_nodes;
  IF visible_count <> 1 THEN RAISE EXCEPTION 'Tenant A node visibility failed: %', visible_count; END IF;
  SELECT count(*) INTO visible_count FROM website_canvas_positions;
  IF visible_count <> 1 THEN RAISE EXCEPTION 'Canvas positions are not user-scoped: %', visible_count; END IF;
  BEGIN
    INSERT INTO website_nodes (organization_id, website_id, graph_id, node_type, schema_version, properties)
    VALUES ('30000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 'component', 1, '{}');
    RAISE EXCEPTION 'Viewer unexpectedly inserted a graph node';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
  BEGIN
    UPDATE website_graphs SET draft_revision = 1 WHERE id = '60000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'Viewer unexpectedly updated graph content';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END $$;
UPDATE website_canvas_positions SET x = 25 WHERE graph_id = '60000000-0000-4000-8000-000000000001'
  AND user_id = '10000000-0000-4000-8000-000000000001';
RESET ROLE;

-- An editor can mutate graph content and append an operation record.
SET ROLE lucia_os_runtime;
SELECT set_config('app.current_user_id', '10000000-0000-4000-8000-000000000002', false);
SELECT set_config('app.current_organization_id', '30000000-0000-4000-8000-000000000001', false);
INSERT INTO website_nodes (organization_id, website_id, graph_id, node_type, schema_version, properties)
VALUES ('30000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 'component', 1, '{}');
INSERT INTO website_graph_operations (
  organization_id, website_id, graph_id, actor_user_id, idempotency_key, request_hash,
  base_revision, result_revision, operations, result
) VALUES (
  '30000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002',
  'graph-ci-operation-0001', repeat('c', 64), 0, 1, '[{"type":"CREATE_NODE"}]', '{"revision":1}'
);
DO $$
BEGIN
  BEGIN
    UPDATE website_graph_versions SET content_hash = repeat('f', 64)
    WHERE graph_id = '60000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'Graph version history unexpectedly allowed an update';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
  BEGIN
    UPDATE website_graph_operations SET result = '{"tampered":true}'
    WHERE graph_id = '60000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'Graph operation history unexpectedly allowed an update';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END $$;
RESET ROLE;

-- A different tenant sees only its own graph.
SET ROLE lucia_os_runtime;
SELECT set_config('app.current_user_id', '20000000-0000-4000-8000-000000000001', false);
SELECT set_config('app.current_organization_id', '30000000-0000-4000-8000-000000000002', false);
DO $$
DECLARE visible_count integer;
BEGIN
  SELECT count(*) INTO visible_count FROM website_graphs;
  IF visible_count <> 1 THEN RAISE EXCEPTION 'Tenant B graph visibility failed: %', visible_count; END IF;
  SELECT count(*) INTO visible_count FROM website_nodes;
  IF visible_count <> 1 THEN RAISE EXCEPTION 'Tenant B node visibility failed: %', visible_count; END IF;
END $$;
RESET ROLE;

-- Composite endpoint FKs must reject a cross-graph edge even for the DB owner.
DO $$
BEGIN
  BEGIN
    INSERT INTO website_edges (
      organization_id, website_id, graph_id, source_node_id, target_node_id,
      edge_type, schema_version, sort_order, properties
    ) VALUES (
      '30000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001',
      '60000000-0000-4000-8000-000000000001',
      '70000000-0000-4000-8000-000000000001',
      '70000000-0000-4000-8000-000000000002',
      'contains_page', 1, 0, '{}'
    );
    RAISE EXCEPTION 'Cross-graph edge unexpectedly passed composite foreign keys';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL;
  END;
END $$;
