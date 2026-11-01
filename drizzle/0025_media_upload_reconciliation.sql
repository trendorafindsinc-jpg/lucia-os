-- Phase 15: recover abandoned uploads and release their reserved storage safely.
CREATE OR REPLACE FUNCTION lucia_claim_stale_media_uploads(batch_size integer DEFAULT 50)
RETURNS TABLE(id uuid,object_key text,upload_id text,bytes integer,mime text,checksum text,kind text,width integer,height integer)
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public SET row_security=off AS $$
 WITH candidates AS (
  SELECT m.id FROM public.website_media m
  WHERE (m.status='pending' AND m.created_at<now()-interval '2 hours') OR (m.status='deleting' AND m.updated_at<now()-interval '30 minutes')
  ORDER BY m.created_at,m.id LIMIT GREATEST(1,LEAST(COALESCE(batch_size,50),100)) FOR UPDATE SKIP LOCKED
 ), claimed AS (
  UPDATE public.website_media m SET status='deleting',updated_at=now() FROM candidates c WHERE m.id=c.id
  RETURNING m.id,m.object_key,m.upload_id,m.bytes,m.mime,m.checksum,m.kind,m.width,m.height
 ) SELECT * FROM claimed;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION lucia_finalize_media_upload(media_id uuid,outcome text,etag_value text DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public SET row_security=off AS $$
DECLARE released_bytes integer;
BEGIN
 IF outcome='ready' THEN
  UPDATE public.website_media SET status='ready',etag=etag_value,upload_id=NULL,updated_at=now() WHERE id=media_id AND status='deleting';
  RETURN FOUND;
 ELSIF outcome='deleted' THEN
  UPDATE public.website_media SET status='deleted',upload_id=NULL,updated_at=now() WHERE id=media_id AND status='deleting' RETURNING bytes INTO released_bytes;
  IF FOUND THEN UPDATE public.media_storage_budget SET reserved_bytes=GREATEST(0,reserved_bytes-released_bytes) WHERE product='lucia-os'; RETURN true; END IF;
  RETURN false;
 END IF;
 RETURN false;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION lucia_claim_stale_media_uploads(integer) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION lucia_finalize_media_upload(uuid,text,text) FROM PUBLIC;
--> statement-breakpoint
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='lucia_os_runtime') THEN GRANT EXECUTE ON FUNCTION lucia_claim_stale_media_uploads(integer) TO lucia_os_runtime; GRANT EXECUTE ON FUNCTION lucia_finalize_media_upload(uuid,text,text) TO lucia_os_runtime; END IF; END $$;
