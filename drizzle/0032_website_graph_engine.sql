-- Graph Engine persistence: additive only. Existing website drafts and publishing data are untouched.
CREATE TABLE website_graphs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  website_id uuid NOT NULL,
  schema_version integer NOT NULL DEFAULT 1,
  draft_revision integer NOT NULL DEFAULT 0,
  published_version_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT website_graphs_website_org_fk
    FOREIGN KEY (organization_id, website_id)
    REFERENCES websites(organization_id, id) ON DELETE CASCADE,
  CONSTRAINT website_graphs_version_revision_check
    CHECK (schema_version > 0 AND draft_revision >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX website_graphs_org_website_uq ON website_graphs(organization_id, website_id);
CREATE UNIQUE INDEX website_graphs_org_website_id_uq ON website_graphs(organization_id, website_id, id);
--> statement-breakpoint
CREATE TABLE website_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  website_id uuid NOT NULL,
  graph_id uuid NOT NULL,
  node_type text NOT NULL,
  schema_version integer NOT NULL DEFAULT 1,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  lifecycle_status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT website_nodes_graph_scope_fk
    FOREIGN KEY (organization_id, website_id, graph_id)
    REFERENCES website_graphs(organization_id, website_id, id) ON DELETE CASCADE,
  CONSTRAINT website_nodes_type_check
    CHECK (node_type IN ('website','page','section','component','design_token','shared_data','interaction','responsive_config','media_reference')),
  CONSTRAINT website_nodes_version_status_check
    CHECK (schema_version > 0 AND lifecycle_status IN ('active','deleted')),
  CONSTRAINT website_nodes_properties_object_check
    CHECK (jsonb_typeof(properties) = 'object')
);
--> statement-breakpoint
CREATE UNIQUE INDEX website_nodes_graph_id_id_uq ON website_nodes(graph_id, id);
CREATE INDEX website_nodes_graph_type_idx ON website_nodes(graph_id, node_type);
--> statement-breakpoint
CREATE TABLE website_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  website_id uuid NOT NULL,
  graph_id uuid NOT NULL,
  source_node_id uuid NOT NULL,
  target_node_id uuid NOT NULL,
  edge_type text NOT NULL,
  schema_version integer NOT NULL DEFAULT 1,
  sort_order integer,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT website_edges_graph_scope_fk
    FOREIGN KEY (organization_id, website_id, graph_id)
    REFERENCES website_graphs(organization_id, website_id, id) ON DELETE CASCADE,
  CONSTRAINT website_edges_source_graph_fk
    FOREIGN KEY (graph_id, source_node_id)
    REFERENCES website_nodes(graph_id, id) ON DELETE CASCADE,
  CONSTRAINT website_edges_target_graph_fk
    FOREIGN KEY (graph_id, target_node_id)
    REFERENCES website_nodes(graph_id, id) ON DELETE CASCADE,
  CONSTRAINT website_edges_type_check
    CHECK (edge_type IN ('contains_page','contains_section','contains_component','uses_design_token','binds_shared_data','references_media','configures_interaction','has_responsive_config')),
  CONSTRAINT website_edges_version_order_check
    CHECK (schema_version > 0 AND (sort_order IS NULL OR sort_order >= 0)
      AND (edge_type NOT IN ('contains_page','contains_section','contains_component') OR sort_order IS NOT NULL)),
  CONSTRAINT website_edges_properties_object_check
    CHECK (jsonb_typeof(properties) = 'object')
);
--> statement-breakpoint
CREATE UNIQUE INDEX website_edges_graph_id_id_uq ON website_edges(graph_id, id);
CREATE UNIQUE INDEX website_edges_unique_relationship_uq ON website_edges(graph_id, edge_type, source_node_id, target_node_id);
CREATE INDEX website_edges_source_order_idx ON website_edges(graph_id, source_node_id, edge_type, sort_order);
CREATE INDEX website_edges_target_idx ON website_edges(graph_id, target_node_id);
--> statement-breakpoint
CREATE TABLE website_graph_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  website_id uuid NOT NULL,
  graph_id uuid NOT NULL,
  revision integer NOT NULL,
  schema_version integer NOT NULL DEFAULT 1,
  snapshot jsonb NOT NULL,
  content_hash text NOT NULL,
  created_by_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT website_graph_versions_graph_scope_fk
    FOREIGN KEY (organization_id, website_id, graph_id)
    REFERENCES website_graphs(organization_id, website_id, id) ON DELETE CASCADE,
  CONSTRAINT website_graph_versions_revision_check
    CHECK (revision >= 0 AND schema_version > 0),
  CONSTRAINT website_graph_versions_snapshot_object_check
    CHECK (jsonb_typeof(snapshot) = 'object'),
  CONSTRAINT website_graph_versions_hash_check
    CHECK (content_hash ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE UNIQUE INDEX website_graph_versions_graph_revision_uq ON website_graph_versions(graph_id, revision);
CREATE UNIQUE INDEX website_graph_versions_graph_id_id_uq ON website_graph_versions(graph_id, id);
CREATE INDEX website_graph_versions_graph_created_idx ON website_graph_versions(graph_id, created_at);
--> statement-breakpoint
-- The graph/version reference is intentionally added after both tables exist.
-- Deferred NO ACTION allows website deletion to cascade the graph and its versions together.
ALTER TABLE website_graphs
  ADD CONSTRAINT website_graphs_published_version_fk
  FOREIGN KEY (id, published_version_id)
  REFERENCES website_graph_versions(graph_id, id)
  ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
CREATE TABLE website_graph_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  website_id uuid NOT NULL,
  graph_id uuid NOT NULL,
  actor_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  base_revision integer NOT NULL,
  result_revision integer NOT NULL,
  operations jsonb NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT website_graph_operations_graph_scope_fk
    FOREIGN KEY (organization_id, website_id, graph_id)
    REFERENCES website_graphs(organization_id, website_id, id) ON DELETE CASCADE,
  CONSTRAINT website_graph_operations_revision_check
    CHECK (base_revision >= 0 AND result_revision = base_revision + 1),
  CONSTRAINT website_graph_operations_idempotency_check
    CHECK (length(btrim(idempotency_key)) BETWEEN 8 AND 200),
  CONSTRAINT website_graph_operations_hash_check
    CHECK (request_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT website_graph_operations_payload_check
    CHECK (jsonb_typeof(operations) = 'array' AND jsonb_typeof(result) = 'object')
);
--> statement-breakpoint
CREATE UNIQUE INDEX website_graph_operations_idempotency_uq ON website_graph_operations(graph_id, actor_user_id, idempotency_key);
CREATE UNIQUE INDEX website_graph_operations_graph_id_id_uq ON website_graph_operations(graph_id, id);
CREATE INDEX website_graph_operations_graph_created_idx ON website_graph_operations(graph_id, created_at);
--> statement-breakpoint
CREATE TABLE website_canvas_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  website_id uuid NOT NULL,
  graph_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  node_id uuid NOT NULL,
  x double precision NOT NULL,
  y double precision NOT NULL,
  locked boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT website_canvas_positions_graph_scope_fk
    FOREIGN KEY (organization_id, website_id, graph_id)
    REFERENCES website_graphs(organization_id, website_id, id) ON DELETE CASCADE,
  CONSTRAINT website_canvas_positions_node_graph_fk
    FOREIGN KEY (graph_id, node_id)
    REFERENCES website_nodes(graph_id, id) ON DELETE CASCADE,
  CONSTRAINT website_canvas_positions_bounds_check
    CHECK (x BETWEEN -1000000 AND 1000000 AND y BETWEEN -1000000 AND 1000000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX website_canvas_positions_graph_user_node_uq ON website_canvas_positions(graph_id, user_id, node_id);
CREATE INDEX website_canvas_positions_graph_user_idx ON website_canvas_positions(graph_id, user_id);
--> statement-breakpoint
-- Apply RLS to every graph table. The runtime role must be non-owner and NOBYPASSRLS.
ALTER TABLE website_graphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_graphs FORCE ROW LEVEL SECURITY;
ALTER TABLE website_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_nodes FORCE ROW LEVEL SECURITY;
ALTER TABLE website_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_edges FORCE ROW LEVEL SECURITY;
ALTER TABLE website_graph_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_graph_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE website_graph_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_graph_operations FORCE ROW LEVEL SECURITY;
ALTER TABLE website_canvas_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_canvas_positions FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY website_graphs_member_select ON website_graphs FOR SELECT USING (
  organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
  AND EXISTS (
    SELECT 1 FROM organization_memberships m
    JOIN organizations o ON o.id = m.organization_id
    WHERE m.organization_id = website_graphs.organization_id
      AND m.user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
      AND m.status = 'active' AND o.status = 'active'
      AND m.role IN ('owner','admin','editor','viewer')
  )
);
CREATE POLICY website_graphs_member_insert ON website_graphs FOR INSERT WITH CHECK (
  organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
  AND EXISTS (
    SELECT 1 FROM organization_memberships m
    JOIN organizations o ON o.id = m.organization_id
    WHERE m.organization_id = website_graphs.organization_id
      AND m.user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
      AND m.status = 'active' AND o.status = 'active'
      AND m.role IN ('owner','admin','editor')
  )
);
CREATE POLICY website_graphs_member_update ON website_graphs FOR UPDATE
  USING (
    organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
    AND EXISTS (
      SELECT 1 FROM organization_memberships m
      JOIN organizations o ON o.id = m.organization_id
      WHERE m.organization_id = website_graphs.organization_id
        AND m.user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        AND m.status = 'active' AND o.status = 'active'
        AND m.role IN ('owner','admin','editor')
    )
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
    AND EXISTS (
      SELECT 1 FROM organization_memberships m
      JOIN organizations o ON o.id = m.organization_id
      WHERE m.organization_id = website_graphs.organization_id
        AND m.user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        AND m.status = 'active' AND o.status = 'active'
        AND m.role IN ('owner','admin','editor')
    )
  );
--> statement-breakpoint
CREATE POLICY website_nodes_member_select ON website_nodes FOR SELECT USING (
  organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
  AND EXISTS (
    SELECT 1 FROM organization_memberships m
    JOIN organizations o ON o.id = m.organization_id
    WHERE m.organization_id = website_nodes.organization_id
      AND m.user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
      AND m.status = 'active' AND o.status = 'active'
      AND m.role IN ('owner','admin','editor','viewer')
  )
);
CREATE POLICY website_nodes_member_insert ON website_nodes FOR INSERT WITH CHECK (
  organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
  AND EXISTS (
    SELECT 1 FROM organization_memberships m
    JOIN organizations o ON o.id = m.organization_id
    WHERE m.organization_id = website_nodes.organization_id
      AND m.user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
      AND m.status = 'active' AND o.status = 'active'
      AND m.role IN ('owner','admin','editor')
  )
);
CREATE POLICY website_nodes_member_update ON website_nodes FOR UPDATE
  USING (
    organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
    AND EXISTS (
      SELECT 1 FROM organization_memberships m
      JOIN organizations o ON o.id = m.organization_id
      WHERE m.organization_id = website_nodes.organization_id
        AND m.user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        AND m.status = 'active' AND o.status = 'active'
        AND m.role IN ('owner','admin','editor')
    )
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
    AND EXISTS (
      SELECT 1 FROM organization_memberships m
      JOIN organizations o ON o.id = m.organization_id
      WHERE m.organization_id = website_nodes.organization_id
        AND m.user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        AND m.status = 'active' AND o.status = 'active'
        AND m.role IN ('owner','admin','editor')
    )
  );
CREATE POLICY website_nodes_member_delete ON website_nodes FOR DELETE USING (
  organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
  AND EXISTS (
    SELECT 1 FROM organization_memberships m
    JOIN organizations o ON o.id = m.organization_id
    WHERE m.organization_id = website_nodes.organization_id
      AND m.user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
      AND m.status = 'active' AND o.status = 'active'
      AND m.role IN ('owner','admin','editor')
  )
);
--> statement-breakpoint
CREATE POLICY website_edges_member_select ON website_edges FOR SELECT USING (
  organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
  AND EXISTS (
    SELECT 1 FROM organization_memberships m
    JOIN organizations o ON o.id = m.organization_id
    WHERE m.organization_id = website_edges.organization_id
      AND m.user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
      AND m.status = 'active' AND o.status = 'active'
      AND m.role IN ('owner','admin','editor','viewer')
  )
);
CREATE POLICY website_edges_member_insert ON website_edges FOR INSERT WITH CHECK (
  organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
  AND EXISTS (
    SELECT 1 FROM organization_memberships m
    JOIN organizations o ON o.id = m.organization_id
    WHERE m.organization_id = website_edges.organization_id
      AND m.user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
      AND m.status = 'active' AND o.status = 'active'
      AND m.role IN ('owner','admin','editor')
  )
);
CREATE POLICY website_edges_member_update ON website_edges FOR UPDATE
  USING (
    organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
    AND EXISTS (
      SELECT 1 FROM organization_memberships m
      JOIN organizations o ON o.id = m.organization_id
      WHERE m.organization_id = website_edges.organization_id
        AND m.user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        AND m.status = 'active' AND o.status = 'active'
        AND m.role IN ('owner','admin','editor')
    )
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
    AND EXISTS (
      SELECT 1 FROM organization_memberships m
      JOIN organizations o ON o.id = m.organization_id
      WHERE m.organization_id = website_edges.organization_id
        AND m.user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        AND m.status = 'active' AND o.status = 'active'
        AND m.role IN ('owner','admin','editor')
    )
  );
CREATE POLICY website_edges_member_delete ON website_edges FOR DELETE USING (
  organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
  AND EXISTS (
    SELECT 1 FROM organization_memberships m
    JOIN organizations o ON o.id = m.organization_id
    WHERE m.organization_id = website_edges.organization_id
      AND m.user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
      AND m.status = 'active' AND o.status = 'active'
      AND m.role IN ('owner','admin','editor')
  )
);
--> statement-breakpoint
CREATE POLICY website_graph_versions_member_select ON website_graph_versions FOR SELECT USING (
  organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
  AND EXISTS (
    SELECT 1 FROM organization_memberships m
    JOIN organizations o ON o.id = m.organization_id
    WHERE m.organization_id = website_graph_versions.organization_id
      AND m.user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
      AND m.status = 'active' AND o.status = 'active'
      AND m.role IN ('owner','admin','editor','viewer')
  )
);
CREATE POLICY website_graph_versions_member_insert ON website_graph_versions FOR INSERT WITH CHECK (
  organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
  AND created_by_user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  AND EXISTS (
    SELECT 1 FROM organization_memberships m
    JOIN organizations o ON o.id = m.organization_id
    WHERE m.organization_id = website_graph_versions.organization_id
      AND m.user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
      AND m.status = 'active' AND o.status = 'active'
      AND m.role IN ('owner','admin','editor')
  )
);
--> statement-breakpoint
CREATE POLICY website_graph_operations_member_select ON website_graph_operations FOR SELECT USING (
  organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
  AND EXISTS (
    SELECT 1 FROM organization_memberships m
    JOIN organizations o ON o.id = m.organization_id
    WHERE m.organization_id = website_graph_operations.organization_id
      AND m.user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
      AND m.status = 'active' AND o.status = 'active'
      AND m.role IN ('owner','admin','editor','viewer')
  )
);
CREATE POLICY website_graph_operations_member_insert ON website_graph_operations FOR INSERT WITH CHECK (
  organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
  AND actor_user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  AND EXISTS (
    SELECT 1 FROM organization_memberships m
    JOIN organizations o ON o.id = m.organization_id
    WHERE m.organization_id = website_graph_operations.organization_id
      AND m.user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
      AND m.status = 'active' AND o.status = 'active'
      AND m.role IN ('owner','admin','editor')
  )
);
--> statement-breakpoint
-- Canvas layout is personal workspace state, not website content. Any active
-- member may arrange their own canvas, including read-only website viewers.
CREATE POLICY website_canvas_positions_member_select ON website_canvas_positions FOR SELECT USING (
  organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
  AND user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  AND EXISTS (
    SELECT 1 FROM organization_memberships m
    JOIN organizations o ON o.id = m.organization_id
    WHERE m.organization_id = website_canvas_positions.organization_id
      AND m.user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
      AND m.status = 'active' AND o.status = 'active'
      AND m.role IN ('owner','admin','editor','viewer')
  )
);
CREATE POLICY website_canvas_positions_member_insert ON website_canvas_positions FOR INSERT WITH CHECK (
  organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
  AND user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  AND EXISTS (
    SELECT 1 FROM organization_memberships m
    JOIN organizations o ON o.id = m.organization_id
    WHERE m.organization_id = website_canvas_positions.organization_id
      AND m.user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
      AND m.status = 'active' AND o.status = 'active'
      AND m.role IN ('owner','admin','editor','viewer')
  )
);
CREATE POLICY website_canvas_positions_member_update ON website_canvas_positions FOR UPDATE
  USING (
    organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
    AND user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    AND EXISTS (
      SELECT 1 FROM organization_memberships m
      JOIN organizations o ON o.id = m.organization_id
      WHERE m.organization_id = website_canvas_positions.organization_id
        AND m.user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        AND m.status = 'active' AND o.status = 'active'
        AND m.role IN ('owner','admin','editor','viewer')
    )
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
    AND user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    AND EXISTS (
      SELECT 1 FROM organization_memberships m
      JOIN organizations o ON o.id = m.organization_id
      WHERE m.organization_id = website_canvas_positions.organization_id
        AND m.user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        AND m.status = 'active' AND o.status = 'active'
        AND m.role IN ('owner','admin','editor','viewer')
    )
  );
CREATE POLICY website_canvas_positions_member_delete ON website_canvas_positions FOR DELETE USING (
  organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
  AND user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  AND EXISTS (
    SELECT 1 FROM organization_memberships m
    JOIN organizations o ON o.id = m.organization_id
    WHERE m.organization_id = website_canvas_positions.organization_id
      AND m.user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
      AND m.status = 'active' AND o.status = 'active'
      AND m.role IN ('owner','admin','editor','viewer')
  )
);
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lucia_os_runtime') THEN
    GRANT USAGE ON SCHEMA public TO lucia_os_runtime;
    GRANT SELECT, INSERT, UPDATE ON website_graphs TO lucia_os_runtime;
    GRANT SELECT, INSERT, UPDATE, DELETE ON website_nodes, website_edges TO lucia_os_runtime;
    GRANT SELECT, INSERT ON website_graph_versions, website_graph_operations TO lucia_os_runtime;
    GRANT SELECT, INSERT, UPDATE, DELETE ON website_canvas_positions TO lucia_os_runtime;
  END IF;
END $$;
