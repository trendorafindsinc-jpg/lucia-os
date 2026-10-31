# LUCIA — Shared Object Storage Architecture (IDrive e2)

**Decision date:** 2026-10-31  
**Status:** Founder-approved architecture recommendation; deployment/integration remains separately gated.  
**Owner:** LUCIA platform infrastructure.  
**Scope:** LUCIA OS and future revenue-generating LUCIA products.

## Decision

Use one LUCIA-managed IDrive e2 account as the initial S3-compatible object-storage provider, while **each product uses a separate private bucket and separate least-privilege credentials**. This is shared infrastructure, not shared access to customer files.

The first provisioned bucket is:

| Setting | Recorded value |
| --- | --- |
| Purpose | LUCIA OS customer-owned website media |
| Bucket | `lucia-os-customer-media-2026` |
| Region | London-2 |
| Endpoint | `https://s3.eu-west-3.idrivee2.com` |
| Default encryption | SSE-S3 / AES-256 configured |
| Object Lock | Not enabled |
| Versioning | Not enabled |
| Public policy | None configured |

**Provisioned does not mean integrated:** application uploads, provider-specific restricted access keys, Vercel secrets and end-to-end media tests still require implementation and verification. Confirm the SDK region identifier with IDrive's actual connection configuration.

## Credential placement

- **Vercel environment variables (per deployed product):** server-only access key ID, secret access key, bucket, endpoint and validated SDK region. Scope environments (production / preview / development) deliberately; use separate credentials where feasible.
- **GitHub repository:** implementation, interface contracts, migrations, public nonsecret setup documentation and example variable **names only**. No real secrets or access keys in source, commits, docs, screenshots, logs or `.env.example`.
- **GitHub Actions Secrets:** only if a specific CI job must access IDrive e2; ordinary runtime uploads must not require GitHub secrets.
- **PostgreSQL:** authoritative media ownership, tenant/project association, object identifiers, MIME/type, optimized size, status, references and lifecycle metadata. Never infer authorization from an object URL or client-supplied key.
- Never prefix secrets with `NEXT_PUBLIC_` or return them to browser bundles.

Suggested **names**, subject to verifying the implemented adapter: `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`. Do not set a fabricated region value; inspect the provider's generated SDK settings first.

## Product isolation

Future product buckets should be created only when the respective product needs storage, for example:

| Product | Dedicated storage purpose |
| --- | --- |
| LUCIA OS | Customer website images, logos, portfolio and artwork |
| LUCIA Store | Protected software packages and purchased/downloadable assets |
| Loom | Moderated profile, community and business media |
| School OS / other products | Product-specific approved documents and files |

Do not create unused buckets or credentials ahead of need. Product credentials must be restricted to that product's bucket (or narrower prefix) and necessary read/write actions. Avoid account-wide keys in application runtime. Keep Store paid download authorization and private school records separately controlled; a publicly accessible website image policy is not appropriate for all products. Service-side access must enforce both product and tenant boundaries. Use the same provider-neutral interface so future products can move buckets or providers without reworking business logic.

## 10 GB shared storage discipline

Treat **10 GB as the current conservative total-account planning budget**, to be verified against the billing plan. It is not 10 GB per bucket or per customer. Add quotas, monitoring and alert thresholds at both global and per-product levels before broadly enabling uploads.

Initial engineering targets, adjustable after measuring real content:

- Logo: approximately 20–100 KB optimized.
- Hero image: approximately 100–250 KB optimized.
- Portfolio/service image: approximately 60–150 KB optimized.
- Thumbnail: approximately 15–40 KB optimized.
- Initial per-website quota proposal: **5 MB**, configurable by LUCIA administration; do not treat it as a hard-coded commercial contract.
- Compress/transcode to WebP/AVIF where supported, bound pixel dimensions, discard nonessential metadata, and avoid storing multiple redundant originals by default.
- Record actual byte usage; reject uploads that would exceed quota. Monitor all buckets and reserve capacity for operations and future paid products.

Storage quotas measure retained object bytes; **monthly internet traffic, request charges and egress are separate considerations**. Do not assume the 10 GB storage allowance represents free bandwidth or total billable usage. Use browser caching and appropriately sized images to reduce traffic.

## Media lifecycle and security gates

1. Authenticated, tenant-authorized upload initiation; strict content type, actual file-signature, file-size and pixel/dimension validation.
2. Private bucket by default; never public-write. Use server-side authorization and short-lived presigned operations only where necessary and safe.
3. Generate opaque, product/tenant-scoped object keys; do not trust caller-provided keys, URLs, filename extensions or ownership.
4. Confirm the finalized object, validate/transcode content and record durable metadata before marking upload successful. No fake success and no Vercel ephemeral filesystem as durable storage.
5. The website composition stores a safe media reference owned by the project; public delivery only exposes explicitly published, approved assets.
6. Save, reload, preview, publish, rollback and revision retention must resolve assets reliably. Never delete an object still referenced by an active draft, published revision or retained recovery version.
7. Controlled replacement, delayed garbage collection and deletion after verified unreferenced status; no uncontrolled indefinite growth.
8. Explicit per-tenant, cross-product access-denial tests; rate limiting, quotas, observability and secret rotation.
9. Separate approved production setup for restricted credentials, Vercel environment configuration, rollout and recovery.

## Relationship to Phase 16

This decision extends `docs/layouts-s3-storage-contract.md` without contradicting the free website path: **built-in Layout editing and free publishing must continue working even if IDrive e2 is unavailable or not configured**. Customer-owned media upload controls should truthfully show unavailable/disabled until the secure, durable integration and tests succeed.

The Phase 16 branch/PR is responsible for implementing customer-owned media if the founder approves that scope. This document alone does **not** implement uploads or authorize an application merge, credential creation, pricing change or production data migration.

## Verification before go-live

- Confirm provider-scoped credentials and correct runtime Vercel variables with no exposure.
- Upload optimized logo, hero and portfolio assets in an isolated environment and verify persistence after process restart/redeploy.
- Confirm safe cross-tenant and cross-product access rejection.
- Confirm public rendering only of published assets, revision rollback, quota rejection and cleanup.
- Capture exact-head CI, Vercel preview and production-safe acceptance evidence before release.
