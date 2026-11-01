-- Phase 15: canonical authorization for inline customer media in Markdown and HTML article bodies.
CREATE OR REPLACE FUNCTION lucia_public_media(media_id uuid)
RETURNS TABLE(object_key text,bytes integer,width integer,height integer,alt text,status text,kind text,mime text,original_name text,checksum text,etag text,caption text,duration_ms integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public SET row_security=off AS $$
 SELECT m.object_key,m.bytes,m.width,m.height,m.alt,m.status,m.kind,m.mime,m.original_name,m.checksum,m.etag,m.caption,m.duration_ms
 FROM public.website_media m
 JOIN public.websites w ON w.id=m.website_id AND w.organization_id=m.organization_id
 JOIN public.organizations o ON o.id=w.organization_id
 WHERE m.id=media_id AND m.status='ready' AND w.status='published' AND o.status='active'
 AND (
   EXISTS(
     SELECT 1 FROM public.website_pages p
     WHERE p.website_id=w.id AND p.organization_id=w.organization_id AND p.status='published'
       AND (p.published_content LIKE '%"media:'||m.id::text||'"%' OR p.published_content LIKE '%/_media/'||m.id::text||'%')
   )
   OR EXISTS(
     SELECT 1 FROM public.website_posts p
     WHERE p.website_id=w.id AND p.organization_id=w.organization_id AND p.status='published'
       AND (
         p.published_snapshot->>'featuredMediaRef'='media:'||m.id::text
         OR p.published_snapshot->>'body' LIKE '%media:'||m.id::text||'%'
         OR p.published_snapshot->>'body' LIKE '%/_media/'||m.id::text||'%'
       )
   )
 )
 LIMIT 1;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION lucia_public_media(uuid) FROM PUBLIC;
--> statement-breakpoint
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='lucia_os_runtime') THEN GRANT EXECUTE ON FUNCTION lucia_public_media(uuid) TO lucia_os_runtime; END IF; END $$;
