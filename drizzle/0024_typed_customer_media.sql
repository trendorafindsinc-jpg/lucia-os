-- Phase 15: typed customer media with direct multipart object storage.
ALTER TABLE website_media ADD COLUMN kind text NOT NULL DEFAULT 'image', ADD COLUMN mime text NOT NULL DEFAULT 'image/webp', ADD COLUMN original_name text, ADD COLUMN checksum text, ADD COLUMN etag text, ADD COLUMN upload_id text, ADD COLUMN caption text, ADD COLUMN duration_ms integer;
--> statement-breakpoint
ALTER TABLE website_media DROP CONSTRAINT IF EXISTS website_media_bounds;
ALTER TABLE website_media ADD CONSTRAINT website_media_bounds CHECK(bytes>0 AND bytes<=100000000 AND width>=0 AND width<=1600 AND height>=0 AND height<=1600 AND (kind<>'image' OR (width>0 AND height>0)) AND length(alt) BETWEEN 1 AND 200 AND status IN ('pending','ready','deleting','deleted'));
--> statement-breakpoint
ALTER TABLE website_media ADD CONSTRAINT website_media_kind_check CHECK(kind IN ('image','video','document')),
 ADD CONSTRAINT website_media_mime_check CHECK((kind='image' AND mime='image/webp') OR (kind='video' AND mime IN ('video/mp4','video/webm')) OR (kind='document' AND mime='application/pdf')),
 ADD CONSTRAINT website_media_checksum_check CHECK(checksum IS NULL OR checksum ~ '^[a-f0-9]{64}$'),
 ADD CONSTRAINT website_media_original_name_check CHECK(original_name IS NULL OR length(original_name)<=255),
 ADD CONSTRAINT website_media_etag_check CHECK(etag IS NULL OR length(etag)<=128),
 ADD CONSTRAINT website_media_upload_id_check CHECK(upload_id IS NULL OR length(upload_id)<=512),
 ADD CONSTRAINT website_media_caption_check CHECK(caption IS NULL OR length(caption)<=200),
 ADD CONSTRAINT website_media_duration_check CHECK(duration_ms IS NULL OR duration_ms BETWEEN 1 AND 3600000);
--> statement-breakpoint
ALTER TABLE website_media_limits ADD COLUMN video_quota_bytes bigint NOT NULL DEFAULT 500000000, ADD COLUMN document_quota_bytes bigint NOT NULL DEFAULT 50000000;
--> statement-breakpoint
ALTER TABLE website_media_limits ADD CONSTRAINT media_video_quota_bounds CHECK(video_quota_bytes BETWEEN 0 AND 1000000000), ADD CONSTRAINT media_document_quota_bounds CHECK(document_quota_bytes BETWEEN 0 AND 250000000);
--> statement-breakpoint
CREATE INDEX website_media_kind_idx ON website_media(organization_id,website_id,kind,status);
--> statement-breakpoint
DROP FUNCTION IF EXISTS lucia_public_media(uuid);
CREATE FUNCTION lucia_public_media(media_id uuid) RETURNS TABLE(object_key text,bytes integer,width integer,height integer,alt text,status text,kind text,mime text,original_name text,checksum text,etag text,caption text,duration_ms integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public SET row_security=off AS $$
 SELECT m.object_key,m.bytes,m.width,m.height,m.alt,m.status,m.kind,m.mime,m.original_name,m.checksum,m.etag,m.caption,m.duration_ms
 FROM public.website_media m JOIN public.websites w ON w.id=m.website_id AND w.organization_id=m.organization_id JOIN public.organizations o ON o.id=w.organization_id
 WHERE m.id=media_id AND m.status='ready' AND w.status='published' AND o.status='active'
 AND (EXISTS(SELECT 1 FROM public.website_pages p WHERE p.website_id=w.id AND p.organization_id=w.organization_id AND p.status='published' AND p.published_content LIKE '%"media:'||m.id::text||'"%')
 OR EXISTS(SELECT 1 FROM public.website_posts p WHERE p.website_id=w.id AND p.organization_id=w.organization_id AND p.status='published' AND (p.published_snapshot->>'featuredMediaRef'='media:'||m.id::text OR p.published_snapshot->>'body' LIKE '%media:'||m.id::text||'%')))
 LIMIT 1;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION lucia_public_media(uuid) FROM PUBLIC;
--> statement-breakpoint
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='lucia_os_runtime') THEN GRANT EXECUTE ON FUNCTION lucia_public_media(uuid) TO lucia_os_runtime; END IF; END $$;
