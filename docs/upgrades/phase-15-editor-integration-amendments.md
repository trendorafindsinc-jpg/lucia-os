# Phase 14/15 — Website-first editor integration amendments

Status: founder-approved implementation scope  
Implementation branch: `upgrade/phase-15-content-media`  
Pull request: #144 (draft; do not merge without explicit approval)

## Product objective

An existing website must be editable as one connected project. Pages, navigation, layout, media, embeds, detailed settings, preview and publishing must not behave as disconnected tools.

## 1. Existing website design change

- Every existing premium website can open **Change Website Design** from its Visual Editor.
- A customer can preview a different candidate visual system against the existing page content.
- Applying a design updates only the saved draft's presentation identity (layout ID/version, category, visual tokens and supported visual-experience preset).
- Preserve the website identity and business profile, page IDs, paths, titles, descriptions, navigation, section IDs/order/content, uploaded media references and permissions.
- Use the existing authenticated `PATCH /api/websites/:websiteId/draft` revision/tenant transaction. Do not create a parallel save route.
- Applying a design never publishes automatically. The customer must preview and publish separately.
- The 48 Phase 14 candidate definitions are engineering candidates, not a declaration of premium design or publishing acceptance. Keep that status visible until independent acceptance is recorded.

## 2. Pages & Navigation in the Visual Editor

- Page selection and navigation clicks use the same active website composition.
- The existing `/pages?websiteId` entry point hands premium websites into the Visual Editor's Pages & Navigation panel instead of loading the legacy isolated structure draft.
- Create, rename and remove non-home pages; preserve the home page.
- Page title and description are saved with the page record.
- Toggle page visibility in the website navigation.
- Reorder navigation items.
- Enforce existing page count, route, permissions, reserved-path and section-lock constraints.
- All edits use the composition edit schema, workspace recovery and revision-checked autosave.

## 3. Customer media and external embeds

- The Visual Editor media panel uses the existing tenant-owned website media library and approved storage provider.
- Support image replacement, image upload, video upload and PDF/document upload.
- Uploaded image, video and document assets can be inserted into a page as validated media sections.
- Video/document sections must reference ready media owned by the same website and of the matching asset kind.
- Support secure provider-based embeds for YouTube, Vimeo, Spotify, SoundCloud, Apple Podcasts, TikTok and Instagram.
- Never accept arbitrary iframe URLs, scripts or executable markup. Convert public share links to fixed allowlisted HTTPS embed URLs.
- Use responsive iframe/video rendering and a direct download link for uploaded documents.
- Media deletion must continue to respect draft, publication and historical references.

## 4. Detailed Settings as the next step

The website journey must visibly communicate:
1. Design and content
2. Pages and navigation
3. Detailed Settings
4. Preview and publish

Detailed Settings remains the existing website settings experience and must be reachable from the Visual Editor with the current website ID. It must retain its SEO, metadata, social, branding, domain, analytics and integration settings and report validation/save status clearly.

## 5. Acceptance gates

- Unit tests for page metadata, navigation visibility/order, safe embed providers, media-section schema and media ownership.
- Authenticated customer journey: open an existing website, preview and apply a different design, confirm content/media/page preservation, edit pages/navigation, upload and insert image/video/PDF, add an external embed, complete Detailed Settings, preview and publish.
- Cross-tenant media references and unsupported embed URLs are rejected.
- Save conflicts do not overwrite another session; failed uploads or saves do not report success.
- Test mobile and desktop layouts, keyboard navigation, focus states and reduced motion.
- Confirm the actual storage provider and CORS configuration before claiming live customer uploads are production-ready.
- Verify exact-head GitHub Quality and Vercel deployment. Vercel rate-limit failures are infrastructure blocks, not passing builds.
- Keep PR #144 draft and unmerged until acceptance is complete and the founder explicitly authorizes merge.
