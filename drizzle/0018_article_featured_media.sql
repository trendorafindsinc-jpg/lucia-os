-- Phase 15: attach website-owned media to Blog/News without introducing a second storage path.
ALTER TABLE website_posts ADD COLUMN featured_media_id uuid;
--> statement-breakpoint
CREATE UNIQUE INDEX website_media_org_website_id_uq ON website_media(organization_id,website_id,id);
--> statement-breakpoint
ALTER TABLE website_posts ADD CONSTRAINT website_posts_featured_media_fk
 FOREIGN KEY(organization_id,website_id,featured_media_id)
 REFERENCES website_media(organization_id,website_id,id) ON DELETE RESTRICT;
--> statement-breakpoint
CREATE INDEX website_posts_featured_media_idx ON website_posts(featured_media_id) WHERE featured_media_id IS NOT NULL;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION lucia_public_media(media_id uuid) RETURNS TABLE(object_key text,bytes integer,width integer,height integer,alt text,status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public SET row_security=off AS $$
 SELECT m.object_key,m.bytes,m.width,m.height,m.alt,m.status FROM public.website_media m
 JOIN public.websites w ON w.id=m.website_id AND w.organization_id=m.organization_id
 JOIN public.organizations o ON o.id=w.organization_id
 WHERE m.id=media_id AND m.status='ready' AND w.status='published' AND o.status='active'
 AND (
  EXISTS(SELECT 1 FROM public.website_pages p WHERE p.website_id=w.id AND p.organization_id=w.organization_id AND p.status='published' AND p.published_content LIKE '%"media:' || m.id::text || '"%')
  OR EXISTS(SELECT 1 FROM public.website_posts p WHERE p.website_id=w.id AND p.organization_id=w.organization_id AND p.status='published' AND p.published_snapshot->>'featuredMediaRef'=('media:' || m.id::text))
 ) LIMIT 1;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION lucia_public_media(uuid) FROM PUBLIC;
--> statement-breakpoint
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='lucia_os_runtime') THEN
  GRANT EXECUTE ON FUNCTION lucia_public_media(uuid) TO lucia_os_runtime;
 END IF;
END $$;
