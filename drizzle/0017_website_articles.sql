-- Phase 15: normalized, site-owned Blog/News publication. Legacy JSON drafts remain intact.
CREATE TABLE website_posts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
 website_id uuid NOT NULL,
 author_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
 kind text NOT NULL CHECK (kind IN ('blog','news')),
 slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) <= 120),
 title text NOT NULL CHECK(length(title) BETWEEN 1 AND 150),
 excerpt text NOT NULL DEFAULT '' CHECK(length(excerpt) <= 320),
 body text NOT NULL DEFAULT '' CHECK(length(body) <= 50000),
 category text NOT NULL DEFAULT '' CHECK(length(category) <= 80),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
 revision integer NOT NULL DEFAULT 1 CHECK(revision > 0),
 published_snapshot jsonb,
 published_slug text,
 published_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT website_posts_website_org_fk FOREIGN KEY(organization_id,website_id)
   REFERENCES websites(organization_id,id) ON DELETE CASCADE,
 CONSTRAINT website_posts_public_snapshot_integrity CHECK(
  (status='draft' AND published_snapshot IS NULL AND published_slug IS NULL AND published_at IS NULL) OR
  (status='published' AND published_snapshot IS NOT NULL AND published_slug IS NOT NULL AND published_at IS NOT NULL)
 )
);
--> statement-breakpoint
CREATE UNIQUE INDEX website_posts_site_slug_uq ON website_posts(organization_id,website_id,kind,slug);
CREATE UNIQUE INDEX website_posts_public_slug_uq ON website_posts(organization_id,website_id,kind,published_slug);
CREATE INDEX website_posts_public_feed_idx ON website_posts(website_id,kind,published_at DESC) WHERE status='published';
CREATE INDEX website_posts_owner_idx ON website_posts(organization_id,website_id,updated_at DESC);
--> statement-breakpoint
CREATE TABLE website_post_revisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL,
 website_id uuid NOT NULL,
 post_id uuid NOT NULL REFERENCES website_posts(id) ON DELETE CASCADE,
 actor_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
 revision integer NOT NULL CHECK(revision > 0),
 event text NOT NULL CHECK(event IN ('create','save','publish','unpublish')),
 snapshot jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT website_post_revisions_website_org_fk FOREIGN KEY(organization_id,website_id)
 REFERENCES websites(organization_id,id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX website_post_revisions_unique ON website_post_revisions(post_id,revision);
--> statement-breakpoint
ALTER TABLE website_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_posts FORCE ROW LEVEL SECURITY;
ALTER TABLE website_post_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_post_revisions FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY website_posts_tenant_read ON website_posts FOR SELECT USING (
 organization_id = NULLIF(current_setting('app.current_organization_id',true),'')::uuid AND
 EXISTS (SELECT 1 FROM organization_memberships m JOIN organizations o ON o.id=m.organization_id
 WHERE m.organization_id=website_posts.organization_id AND m.user_id=NULLIF(current_setting('app.current_user_id',true),'')::uuid
 AND m.status='active' AND o.status='active' AND m.role IN ('owner','admin','editor','viewer'))
);
CREATE POLICY website_posts_public_read ON website_posts FOR SELECT USING (
 status='published' AND published_snapshot IS NOT NULL AND
 EXISTS(SELECT 1 FROM websites w JOIN organizations o ON o.id=w.organization_id
 JOIN website_domains d ON d.website_id=w.id AND d.organization_id=w.organization_id
 WHERE w.id=website_posts.website_id AND w.organization_id=website_posts.organization_id
 AND w.status='published' AND o.status='active' AND d.status='active')
);
CREATE POLICY website_posts_tenant_insert ON website_posts FOR INSERT WITH CHECK (
 organization_id=NULLIF(current_setting('app.current_organization_id',true),'')::uuid AND
 EXISTS(SELECT 1 FROM organization_memberships m JOIN organizations o ON o.id=m.organization_id
 WHERE m.organization_id=website_posts.organization_id AND m.user_id=NULLIF(current_setting('app.current_user_id',true),'')::uuid
 AND m.status='active' AND o.status='active' AND m.role IN ('owner','admin','editor'))
);
CREATE POLICY website_posts_tenant_update ON website_posts FOR UPDATE
 USING(organization_id=NULLIF(current_setting('app.current_organization_id',true),'')::uuid AND
 EXISTS(SELECT 1 FROM organization_memberships m WHERE m.organization_id=website_posts.organization_id AND
 m.user_id=NULLIF(current_setting('app.current_user_id',true),'')::uuid AND m.status='active' AND m.role IN ('owner','admin','editor')))
 WITH CHECK(organization_id=NULLIF(current_setting('app.current_organization_id',true),'')::uuid AND
 EXISTS(SELECT 1 FROM organization_memberships m WHERE m.organization_id=website_posts.organization_id AND
 m.user_id=NULLIF(current_setting('app.current_user_id',true),'')::uuid AND m.status='active' AND m.role IN ('owner','admin','editor')));
--> statement-breakpoint
CREATE POLICY website_post_revisions_tenant_read ON website_post_revisions FOR SELECT USING(
 organization_id=NULLIF(current_setting('app.current_organization_id',true),'')::uuid AND
 EXISTS(SELECT 1 FROM organization_memberships m WHERE m.organization_id=website_post_revisions.organization_id
 AND m.user_id=NULLIF(current_setting('app.current_user_id',true),'')::uuid AND m.status='active'));
CREATE POLICY website_post_revisions_tenant_insert ON website_post_revisions FOR INSERT WITH CHECK(
 organization_id=NULLIF(current_setting('app.current_organization_id',true),'')::uuid AND
 EXISTS(SELECT 1 FROM organization_memberships m WHERE m.organization_id=website_post_revisions.organization_id
 AND m.user_id=NULLIF(current_setting('app.current_user_id',true),'')::uuid AND m.status='active'
 AND m.role IN ('owner','admin','editor')));
--> statement-breakpoint
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='lucia_os_runtime') THEN
 GRANT SELECT,INSERT,UPDATE ON website_posts TO lucia_os_runtime;
 GRANT SELECT,INSERT ON website_post_revisions TO lucia_os_runtime;
 END IF;
END $$;
