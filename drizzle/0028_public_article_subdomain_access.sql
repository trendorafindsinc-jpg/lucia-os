-- Published articles are public on both bound custom domains and LUCIA platform subdomains.
DROP POLICY IF EXISTS website_posts_public_read ON website_posts;
--> statement-breakpoint
CREATE POLICY website_posts_public_read ON website_posts FOR SELECT USING(
 status='published' AND published_snapshot IS NOT NULL AND
 EXISTS(SELECT 1 FROM websites w JOIN organizations o ON o.id=w.organization_id
 WHERE w.id=website_posts.website_id AND w.organization_id=website_posts.organization_id
 AND w.status='published' AND o.status='active')
);
--> statement-breakpoint
DROP POLICY IF EXISTS website_post_slug_redirects_public_read ON website_post_slug_redirects;
CREATE POLICY website_post_slug_redirects_public_read ON website_post_slug_redirects FOR SELECT USING(
 EXISTS(SELECT 1 FROM website_posts p JOIN websites w ON w.id=p.website_id AND w.organization_id=p.organization_id
 JOIN organizations o ON o.id=w.organization_id JOIN website_domains d ON d.website_id=w.id AND d.organization_id=w.organization_id
 WHERE p.id=website_post_slug_redirects.post_id AND p.status='published' AND p.published_slug IS NOT NULL
 AND p.website_id=website_post_slug_redirects.website_id AND p.organization_id=website_post_slug_redirects.organization_id
 AND p.kind=website_post_slug_redirects.kind AND w.status='published' AND o.status='active')
);
