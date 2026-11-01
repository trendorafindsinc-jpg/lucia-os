CREATE TABLE "media_storage_budget" (
	"product" text PRIMARY KEY NOT NULL,
	"reserved_bytes" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "website_media" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"website_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"last_published_at" timestamp with time zone,
	"bytes" integer NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"alt" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "website_media_limits" (
	"website_id" uuid PRIMARY KEY NOT NULL,
	"quota_bytes" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "website_media" ADD CONSTRAINT "website_media_created_by_user_id_app_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."app_users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "website_media" ADD CONSTRAINT "website_media_website_org_fk" FOREIGN KEY ("organization_id","website_id") REFERENCES "public"."websites"("organization_id","id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "website_media_limits" ADD CONSTRAINT "website_media_limits_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "website_media_key_uq" ON "website_media" USING btree ("object_key");
--> statement-breakpoint
CREATE INDEX "website_media_owner_idx" ON "website_media" USING btree ("organization_id","website_id","status");
--> statement-breakpoint
ALTER TABLE website_media ADD CONSTRAINT website_media_bounds CHECK(bytes > 0 AND bytes <= 260000 AND width > 0 AND width <= 1600 AND height > 0 AND height <= 1600 AND length(alt) BETWEEN 1 AND 200 AND status IN ('pending','ready','deleting','deleted'));
ALTER TABLE media_storage_budget ADD CONSTRAINT media_budget_nonnegative CHECK(reserved_bytes >= 0);
ALTER TABLE website_media_limits ADD CONSTRAINT media_quota_bounds CHECK(quota_bytes BETWEEN 260000 AND 100000000);
INSERT INTO media_storage_budget(product,reserved_bytes) VALUES('lucia-os',0);
--> statement-breakpoint
ALTER TABLE website_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_media FORCE ROW LEVEL SECURITY;
CREATE POLICY website_media_tenant ON website_media FOR ALL USING (
 organization_id = nullif(current_setting('app.current_organization_id',true),'')::uuid AND EXISTS(
 SELECT 1 FROM organization_memberships m JOIN organizations o ON o.id=m.organization_id
 WHERE m.organization_id=website_media.organization_id AND m.user_id=nullif(current_setting('app.current_user_id',true),'')::uuid AND m.status='active' AND m.role IN ('owner','admin','editor','viewer') AND o.status='active')
) WITH CHECK (
 organization_id = nullif(current_setting('app.current_organization_id',true),'')::uuid AND EXISTS(
 SELECT 1 FROM organization_memberships m JOIN organizations o ON o.id=m.organization_id
 WHERE m.organization_id=website_media.organization_id AND m.user_id=nullif(current_setting('app.current_user_id',true),'')::uuid AND m.status='active' AND m.role IN ('owner','admin','editor') AND o.status='active')
);
--> statement-breakpoint
CREATE FUNCTION lucia_public_media(media_id uuid) RETURNS TABLE(object_key text,bytes integer,width integer,height integer,alt text,status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public SET row_security=off AS $$
 SELECT m.object_key,m.bytes,m.width,m.height,m.alt,m.status FROM public.website_media m
 JOIN public.websites w ON w.id=m.website_id AND w.organization_id=m.organization_id
 JOIN public.organizations o ON o.id=w.organization_id
 WHERE m.id=media_id AND m.status='ready' AND w.status='published' AND o.status='active'
 AND EXISTS(SELECT 1 FROM public.website_pages p WHERE p.website_id=w.id AND p.organization_id=w.organization_id AND p.status='published' AND p.published_content LIKE '%"media:' || m.id::text || '"%') LIMIT 1;
$$;
-- SECURITY DEFINER functions otherwise grant EXECUTE to PUBLIC by default.
REVOKE ALL ON FUNCTION lucia_public_media(uuid) FROM PUBLIC;
--> statement-breakpoint
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='lucia_os_runtime') THEN
 GRANT SELECT,INSERT,UPDATE ON website_media,media_storage_budget,website_media_limits TO lucia_os_runtime;
 GRANT EXECUTE ON FUNCTION lucia_public_media(uuid) TO lucia_os_runtime;
 END IF;
END $$;
