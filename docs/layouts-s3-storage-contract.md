# LUCIA OS — Approved Layouts storage and S3 integration contract

**Status:** Approved product/architecture decision; implementation pending.  
**Scope:** Free Layout Studio and Layouts (Phases 11–19), future durable media storage.  
**Authority:** Founder approved hybrid complete-site designs with customizable sections, Guided/Advanced editing modes, and the storage strategy recorded below.

## Decision

Layouts and standard free website creation must **not** depend on S3 configuration. The missing S3 environment variables do not block Phases 11–19. Never imply that media uploads persist on Vercel's ephemeral filesystem.

| Data/assets | Source of truth / storage |
| --- | --- |
| Built-in Layout definitions, composition primitives and design tokens | Version-controlled, validated repository definitions |
| Built-in Layout imagery | Optimized, licensed static application assets |
| Customer website projects, page content, ownership and published metadata | Existing tenant-authorized PostgreSQL records |
| Customer-uploaded media | Future durable S3-compatible object storage behind a server-side adapter |
| Published media | Existing supported durable references; migrate to object storage when available |

Existing working image/media workflows must be audited and preserved. If durable uploads are not configured, disable only the affected upload controls or show an accurate unsupported-state message; never claim a successful permanent upload.

## Storage adapter boundary

Implement a provider-neutral, server-side media adapter when required by the media phase. Its operations should cover validated upload intent, durable object storage, authorized access, metadata, and controlled deletion. Database records—not object URLs or client-supplied storage keys—remain authoritative for ownership and tenant/resource association. Require authenticated ownership, size and MIME/signature validation, safe names/keys, rate and quota limits, bounded image dimensions and careful treatment of private versus published assets. Published references must remain stable across preview and publishing. Avoid public-write buckets, untrusted file execution, and secret exposure in client bundles.

S3-compatible options may include AWS S3, Cloudflare R2 or IDrive e2. No provider is approved or connected by this decision. Review the repository's actual environment contract before adopting variable names. Possible *illustrative* server-only configuration keys are:

```text
S3_ENDPOINT
S3_REGION
S3_BUCKET
S3_ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY
```

These keys are **not yet verified or configured**. No credentials are stored in the repository. Never return secrets or signed private URLs in logs or documentation. Cloud-hosted object storage may have usage fees independent of LUCIA's customer pricing.

## Release gates

1. Phases 11–19 must remain useful without S3: browsing free complete Layouts, selecting, customizing supported text/settings, previewing and publishing through existing durable website data paths.
2. Do not introduce fake upload success or temporary local uploads presented as persistent.
3. Add durable customer-media functionality only after selecting a provider, configuring server-side credentials, performing secure upload and authorization testing, and verifying publish/reload behavior.
4. Preserve existing customer content and media references. Plan safe migration and rollback before changing published asset URLs.
5. Do not confuse the **₦5,000 one-time custom-domain access** sold through LUCIA Store with charges for built-in Layouts; standard website creation and publishing remain free on a supported LUCIA address.
6. Storage configuration and infrastructure deployment require separate authorization. This document alone does not authorize external bucket creation, production variable changes, or migration of assets.

## Approved Paystack payment contract (documentation decision)

**Provider:** Paystack is the approved LUCIA OS payment provider for LUCIA Store purchases; this is a product decision, not a claim that Paystack checkout or credentials are already configured.

- Standard Layouts, website creation, editing, preview and publishing on a supported LUCIA address remain **free**.
- **Custom Domain Access** is a **₦5,000 one-time Store product**, purchased independently of software. It grants platform access to connect an eligible customer-owned domain; registration and registrar renewal costs are separate. Do not represent the charge as domain ownership, an annual renewal or a subscription.
- Commercial software is purchased as a **specific version** through a one-time purchase with the disclosed licence and one-year updates/maintenance coverage. A future major version is an optional separate purchase, not an automatic recurring charge.
- Customer-operated subscriptions to their own software end users are distinct from purchases from LUCIA.
- The server must establish the trusted order, user, product, amount and currency (**NGN 5,000 = 500,000 kobo**). Never trust client-supplied prices or payment-success flags.
- Create Paystack payment attempts with unique references. Activate a domain-access entitlement or software licence **only after server-to-server verification** of Paystack transaction status, amount, currency, reference, product and the intended customer. A return URL or screenshot is never proof of payment.
- Verify webhook authenticity using the provider's documented signing contract, process retries idempotently, and prevent duplicate activation. Reconcile pending/abandoned transactions; account for failed, disputed and refunded payments with auditable transitions.
- Check tenant ownership and domain verification independently of payment entitlement. A successful charge alone never proves domain ownership or authorizes cross-tenant association.
- Keep Paystack secret keys server-side in deployment secrets. Do not log secrets, expose them in browser bundles or hardcode endpoints/credentials.
- Implement checkout, Store entitlements, reconciliation and any required migrations only in their approved functional phases, with separate rollout authorization. Do not add fake checkout buttons or activate custom domains in a documentation-only change.

## Relationship to the Layouts plan

- **Phase 11:** audit current free website creation, publishing, domain gates and existing media handling.
- **Phases 12–15:** inventory, architect and build professional complete Layouts and accurate previews using checked-in assets.
- **Phase 16:** provide meaningful content replacement and customization; only enable persistent uploads where durable storage is proven.
- **Phases 17–19:** expand the catalogue and validate full website flows without assuming S3 is ready.

**Explicit limitation:** S3 integration, provider selection, bucket configuration and customer-media migration are not implemented by this architectural decision.
