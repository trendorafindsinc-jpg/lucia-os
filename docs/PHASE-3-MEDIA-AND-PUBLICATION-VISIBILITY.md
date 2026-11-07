# LUCIA OS — Phase 3 Media & Publication Visibility

**Repository:** `trendorafindsinc-jpg/lucia-os`  
**Integration target:** `development`  
**Staging app:** `https://dev-os.lucia.name.ng`  
**Production:** `main` — protected; no production changes authorized  
**Feature branch:** `feature/phase-3-media-rich-content-visibility`  
**Baseline inspected:** `53c13f963087a1c5ac9b0377ca22a42ab12e3b61`

## 1. Priority Zero investigation

### Confirmed public-link defect

The Phase 2 publishing UI constructed website and article links from the website slug using a hard-coded production suffix:

- Publishing Studio: `https://{siteSlug}.lucia.name.ng`
- Article list: `https://{siteSlug}.lucia.name.ng/{blog|news}/{publishedSlug}`
- Article editor: the same hard-coded host construction

The staging environment explicitly uses `LUCIA_SITE_DOMAIN=dev.lucia.name.ng`, and the staging website's registered active hostname is `time-flow.dev.lucia.name.ng`. The previous UI therefore generated `time-flow.lucia.name.ng`, which is a different host and does not address the staging website's database. This is a real public-navigation defect and can make a successfully published staging article appear missing when the generated View link is followed.

The staging Vercel project has the exact development deployment for the inspected Phase 2 commit. The `time-flow.dev.lucia.name.ng` domain is verified and attached to the `development` branch. The staging suffix is configured correctly; the defect was the UI assuming the production suffix instead of using the website's registered active hostname.

### Staging database state at inspection

The isolated staging database currently contains one Blog record for `time-flow` and no News records. The Blog record is `draft`, with no `published_snapshot`, `published_slug`, or `published_at`. The public-read policy correctly excludes it.

This means the inspected row has not completed publication in the staging database. It does not prove why a prior user action may have appeared successful. The Phase 3 implementation adds a client-side publication postcondition so a 200 response cannot produce a success message unless the returned row confirms `status=published`, a public slug, publication timestamp, and snapshot. A real staging publish acceptance run remains required after the feature branch is deployed.

### Database and public-read checks

- Website status is `published`.
- Registered website hostname `time-flow.dev.lucia.name.ng` is `active`.
- The `website_posts_public_read` RLS policy requires a published post, non-null published snapshot, a published website, and an active website-domain binding.
- The public policy is intentionally excluding drafts; it must not be weakened to make draft content visible.
- No staging or production data was modified during investigation.

## 2. Implemented visibility correction

- The authorized article-list API now returns the active registered hostname for the requested website, preferring its primary active domain.
- Publishing Studio's View Website link uses that hostname.
- Published article links in the list use that hostname and the article's kind-specific route.
- The editor's View live article link uses the same resolved host.
- Article URL construction validates the hostname and supports staging subdomains and customer custom domains.
- The editor verifies the returned publication state before showing a successful publish message.

No public-read RLS policy was relaxed, and no second publishing system was introduced.

## 3. Phase 3 media implementation

The existing media service already provides tenant-owned media records, image uploads, multipart video/PDF uploads, storage quotas, upload finalization, and public media authorization. Phase 3 extends its article integration:

- Inline image insertion preserves the media record's alternative text and caption.
- Multiple ready images can be selected in order and inserted as a responsive article gallery.
- Inline video insertion uses the existing validated video assets and includes its caption.
- PDF assets remain downloadable through the existing protected media route.
- Existing YouTube, Vimeo, Spotify, SoundCloud, Apple Podcasts, TikTok, and Instagram embed resolution remains allowlisted and sanitized.
- Direct audio-file uploads are not added: the current media model and upload pipeline support image, video, and PDF only. Audio remains supported through approved external audio providers where available.

Article media is retained in the existing body/legacy-block compatibility path so the Phase 2 structured content model, Markdown/HTML compatibility, media ownership validation, and existing public media authorization function continue to work. The public media function only serves assets referenced by published content; private uploads remain private.

## 4. Security and tenancy requirements

- Every referenced media asset must be ready and belong to the same organization and website as the article.
- Publishing validates the media references in the article body in the same transaction as publication.
- Public media access is limited to assets referenced by published pages or published article snapshots.
- Draft media references do not grant public access.
- Existing LUCIA Core authentication and organization authorization remain authoritative.
- External embeds remain HTTPS-only and restricted to approved provider hosts and URL shapes.
- Unsupported URLs, invalid media IDs, and unsupported MIME types fail closed.

## 5. Verification required before merge

1. Create a Blog draft and a News draft in staging.
2. Save and reload both; verify draft status and private public routes.
3. Publish the Blog draft; verify the returned database state and its public Blog listing.
4. Open the exact public article URL generated by Publishing Studio.
5. Repeat for News and verify the News listing/detail route.
6. Verify unpublish removes public access while preserving the draft.
7. Upload and insert a captioned image; verify alt text and caption in preview and public rendering.
8. Select at least two images, insert a gallery, reorder by selection order, and verify responsive public rendering.
9. Insert a video and a PDF; verify public media delivery and file behavior.
10. Verify approved external video/audio embeds render and unsafe/unsupported providers are rejected.
11. Verify cross-tenant media references and private/draft media URLs remain inaccessible.
12. Run focused tests, type checking, lint, and the repository's quality workflow on the exact PR head.

## 6. Release boundary

This feature branch targets `development` only. Opening a PR does not authorize merging. Do not merge into `development` until the user explicitly approves. Do not merge into `main`, change production data, change production DNS, or deploy production without separate explicit approval. Vercel automatic deployments are disabled; do not trigger manual deployments without authorization.
