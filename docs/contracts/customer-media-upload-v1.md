# LUCIA customer media upload contract v1

## Upload flow

All mutations require an authenticated LUCIA ID session, an allowed workspace origin, the matching workspace-account header, and website edit permission. The server creates object keys; clients cannot choose bucket paths.

1. The client computes a SHA-256 digest and sends `POST /api/websites/{websiteId}/media/assets` with `action=create`, media kind, MIME, filename, byte length, digest, the first 32 file bytes (base64), and an accessible description. Supported types are MP4/WebM video (100 MB maximum) and PDF documents (25 MB maximum). File signatures, MIME, extension, per-site quotas, global reserved capacity and upload rate are checked before an upload session is created.
2. The API returns a media ID, opaque multipart upload ID, 8 MiB part size and short-lived presigned URLs. The browser uploads each part directly to the private IDrive e2 bucket and records the provider ETag.
3. The client sends `action=complete` with the exact ordered part/ETag manifest. The server completes the multipart upload, performs a HEAD check for exact byte length, MIME, stored SHA-256 metadata and ETag, then marks the asset ready. `action=abort` cancels an incomplete upload and releases its reserved quota.

## Delivery and retention

- Public delivery is allowed only when the media is referenced by a published website page or published Blog/News snapshot for an active published website. Draft-only and scheduled-only media are not public.
- Video responses support HTTP byte ranges for browser playback. PDFs are forced to download with `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`.
- Markdown references use `media:<uuid>`; the safe renderer resolves these to `/_media/<uuid>`. Publication validates that each referenced asset belongs to the same website and is ready. Referenced assets cannot be deleted; published assets retain the existing 30-day grace period.
- Image, video and PDF quotas are reported separately. Global storage reservations are released only after provider cleanup is confirmed.
- The private London-2 IDrive bucket has AES-256 default encryption and CORS restricted to the LUCIA OS production origin. No public bucket policy is installed.
- `/api/cron/reconcile-media` is invoked by the Phase 15 GitHub Actions worker every five minutes using a repository/workflow-scoped OIDC token. It recovers or removes stale pending rows after two hours and aborts unreferenced incomplete multipart sessions older than seven days. Failed cleanup remains reserved and is retried; the database queue is safe to process again on the next worker run.

## Release gate

The upload UI/API remains controlled by `MEDIA_UPLOADS_ENABLED`. Production and general preview uploads must remain disabled until the isolated authenticated browser acceptance verifies direct multipart upload, ETag exposure, completion, range playback, PDF attachment delivery, quota enforcement, cross-tenant denial, deletion retention and reconciliation. Do not enable the flag merely because the code or provider multipart initiation test passes.
