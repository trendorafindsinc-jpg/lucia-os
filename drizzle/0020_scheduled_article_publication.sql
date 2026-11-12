-- Phase 15: durable scheduled publication queue and idempotent worker.
ALTER TABLE website_posts ADD COLUMN scheduled_at timestamptz;
--> statement-breakpoint
ALTER TABLE website_posts DROP CONSTRAINT IF EXISTS website_posts_status_check;
ALTER TABLE website_posts ADD CONSTRAINT website_posts_status_check CHECK(status IN ('draft','scheduled','published'));
--> statement-breakpoint
ALTER TABLE website_posts DROP CONSTRAINT IF EXISTS website_posts_public_snapshot_integrity;
ALTER TABLE website_posts ADD CONSTRAINT website_posts_public_snapshot_integrity CHECK((status='draft' AND published_snapshot IS NULL AND published_slug IS NULL AND published_at IS NULL AND scheduled_at IS NULL) OR (status='scheduled' AND published_snapshot IS NULL AND published_slug IS NULL AND published_at IS NULL AND scheduled_at IS NOT NULL) OR (status='published' AND published_snapshot IS NOT NULL AND published_slug IS NOT NULL AND published_at IS NOT NULL AND scheduled_at IS NULL));
--> statement-breakpoint
CREATE INDEX website_posts_due_schedule_idx ON website_posts(scheduled_at) WHERE status='scheduled';
--> statement-breakpoint
ALTER TABLE website_post_revisions DROP CONSTRAINT IF EXISTS website_post_revisions_event_check;
ALTER TABLE website_post_revisions ADD CONSTRAINT website_post_revisions_event_check CHECK(event IN ('create','save','publish','unpublish','schedule','scheduled_publish','legacy_import'));
--> statement-breakpoint
CREATE OR REPLACE FUNCTION lucia_publish_due_articles(batch_size integer DEFAULT 25) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public SET row_security=off AS $$
DECLARE candidate record; snapshot jsonb; n integer:=0;
BEGIN
 FOR candidate IN SELECT p.* FROM public.website_posts p JOIN public.websites w ON w.id=p.website_id AND w.organization_id=p.organization_id JOIN public.organizations o ON o.id=p.organization_id WHERE p.status='scheduled' AND p.scheduled_at<=now() AND w.status='published' AND o.status='active' AND EXISTS(SELECT 1 FROM public.website_domains d WHERE d.website_id=w.id AND d.organization_id=w.organization_id AND d.status='active') AND EXISTS(SELECT 1 FROM public.organization_memberships m WHERE m.organization_id=p.organization_id AND m.user_id=p.author_user_id AND m.status='active' AND m.role IN ('owner','admin','editor')) AND (p.featured_media_id IS NULL OR EXISTS(SELECT 1 FROM public.website_media wm WHERE wm.id=p.featured_media_id AND wm.organization_id=p.organization_id AND wm.website_id=p.website_id AND wm.status='ready')) ORDER BY p.scheduled_at,p.id LIMIT GREATEST(1,LEAST(COALESCE(batch_size,25),100)) FOR UPDATE OF p SKIP LOCKED
 LOOP
 snapshot:=jsonb_build_object('kind',candidate.kind,'title',candidate.title,'slug',candidate.slug,'excerpt',candidate.excerpt,'body',candidate.body,'category',candidate.category,'tags',candidate.tags,'seoTitle',candidate.seo_title,'seoDescription',candidate.seo_description,'authorName',(SELECT au.display_name FROM public.app_users au WHERE au.id=candidate.author_user_id),'eventAt',candidate.event_at,'isFeatured',candidate.is_featured,'correctionNote',candidate.correction_note,'correctsSlug',candidate.corrects_slug,'featuredMediaRef',CASE WHEN candidate.featured_media_id IS NULL THEN NULL ELSE 'media:'||candidate.featured_media_id::text END,'featuredMediaAlt',(SELECT wm.alt FROM public.website_media wm WHERE wm.id=candidate.featured_media_id AND wm.status='ready'));
 UPDATE public.website_posts SET status='published',published_snapshot=snapshot,published_slug=candidate.slug,published_at=now(),scheduled_at=NULL,revision=revision+1,updated_at=now() WHERE id=candidate.id AND organization_id=candidate.organization_id;
 UPDATE public.website_media SET last_published_at=now(),updated_at=now() WHERE id=candidate.featured_media_id AND organization_id=candidate.organization_id AND website_id=candidate.website_id;
 INSERT INTO public.website_post_revisions(organization_id,website_id,post_id,actor_user_id,revision,event,snapshot) VALUES(candidate.organization_id,candidate.website_id,candidate.id,candidate.author_user_id,candidate.revision+1,'scheduled_publish',jsonb_build_object('draft',snapshot,'live',snapshot,'status','published','publishedSlug',candidate.slug,'at',now()));n:=n+1;
 END LOOP;RETURN n;END;$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION lucia_publish_due_articles(integer) FROM PUBLIC;
--> statement-breakpoint
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='lucia_os_runtime') THEN GRANT EXECUTE ON FUNCTION lucia_publish_due_articles(integer) TO lucia_os_runtime; END IF; END $$;
