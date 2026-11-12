-- Phase 15: preserve published article URLs when an author changes the slug.
CREATE TABLE website_post_slug_redirects (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL,
 website_id uuid NOT NULL,
 post_id uuid NOT NULL REFERENCES website_posts(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('blog','news')),
 old_slug text NOT NULL CHECK(old_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(old_slug)<=120),
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT website_post_slug_redirects_website_org_fk FOREIGN KEY(organization_id,website_id)
   REFERENCES websites(organization_id,id) ON DELETE CASCADE,
 CONSTRAINT website_post_slug_redirects_unique UNIQUE(organization_id,website_id,kind,old_slug)
);
--> statement-breakpoint
CREATE INDEX website_post_slug_redirects_post_idx ON website_post_slug_redirects(post_id);
--> statement-breakpoint
ALTER TABLE website_post_slug_redirects ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_post_slug_redirects FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY website_post_slug_redirects_tenant_read ON website_post_slug_redirects FOR SELECT USING(
 organization_id=NULLIF(current_setting('app.current_organization_id',true),'')::uuid AND
 EXISTS(SELECT 1 FROM organization_memberships m JOIN organizations o ON o.id=m.organization_id
 WHERE m.organization_id=website_post_slug_redirects.organization_id AND m.user_id=NULLIF(current_setting('app.current_user_id',true),'')::uuid
 AND m.status='active' AND o.status='active' AND m.role IN ('owner','admin','editor','viewer'))
);
CREATE POLICY website_post_slug_redirects_public_read ON website_post_slug_redirects FOR SELECT USING(
 EXISTS(SELECT 1 FROM website_posts p JOIN websites w ON w.id=p.website_id AND w.organization_id=p.organization_id
 JOIN organizations o ON o.id=w.organization_id JOIN website_domains d ON d.website_id=w.id AND d.organization_id=w.organization_id
 WHERE p.id=website_post_slug_redirects.post_id AND p.status='published' AND p.published_slug IS NOT NULL
 AND p.website_id=website_post_slug_redirects.website_id AND p.organization_id=website_post_slug_redirects.organization_id
 AND p.kind=website_post_slug_redirects.kind AND w.status='published' AND o.status='active' AND d.status='active')
);
--> statement-breakpoint
CREATE POLICY website_post_slug_redirects_tenant_insert ON website_post_slug_redirects FOR INSERT WITH CHECK(
 organization_id=NULLIF(current_setting('app.current_organization_id',true),'')::uuid AND
 EXISTS(SELECT 1 FROM organization_memberships m JOIN organizations o ON o.id=m.organization_id
 WHERE m.organization_id=website_post_slug_redirects.organization_id AND m.user_id=NULLIF(current_setting('app.current_user_id',true),'')::uuid
 AND m.status='active' AND o.status='active' AND m.role IN ('owner','admin','editor'))
);
CREATE POLICY website_post_slug_redirects_tenant_update ON website_post_slug_redirects FOR UPDATE
 USING(organization_id=NULLIF(current_setting('app.current_organization_id',true),'')::uuid AND
 EXISTS(SELECT 1 FROM organization_memberships m WHERE m.organization_id=website_post_slug_redirects.organization_id
 AND m.user_id=NULLIF(current_setting('app.current_user_id',true),'')::uuid AND m.status='active' AND m.role IN ('owner','admin','editor')))
 WITH CHECK(organization_id=NULLIF(current_setting('app.current_organization_id',true),'')::uuid AND
 EXISTS(SELECT 1 FROM organization_memberships m WHERE m.organization_id=website_post_slug_redirects.organization_id
 AND m.user_id=NULLIF(current_setting('app.current_user_id',true),'')::uuid AND m.status='active' AND m.role IN ('owner','admin','editor')));
--> statement-breakpoint
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='lucia_os_runtime') THEN
  GRANT SELECT,INSERT,UPDATE ON website_post_slug_redirects TO lucia_os_runtime;
 END IF;
END $$;
