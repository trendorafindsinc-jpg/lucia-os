# Environment Setup

## Environment separation

Maintain separate values and resources for local development, preview/staging, and production. Production must not point at a developer database, preview database, test payment account, or development storage bucket.

## Initial variables

Copy `.env.example` to `.env.local` for local work. The app must be able to render its initial shell without external credentials; features that require credentials must report configuration errors safely.

- `DATABASE_URL`: Neon PostgreSQL connection string. Use the pooled URL for normal application traffic where appropriate; use a direct connection for migrations when required by the migration tooling.
- `LUCIA_CORE_ISSUER`: verified LUCIA Secure/Core issuer URL, once confirmed against its documented contract.
- `LUCIA_CORE_CLIENT_ID`: registered client identifier.
- `LUCIA_CORE_CLIENT_SECRET`: server-only secret, if the agreed Core flow requires one.
- `LUCIA_CORE_REDIRECT_URI`: exact registered callback URL.
- `APP_BASE_URL`: canonical base URL for the current environment.
- `SESSION_SECRET`: high-entropy session signing/encryption secret if required by the selected session implementation.
- `OBJECT_STORAGE_ENDPOINT`, `OBJECT_STORAGE_BUCKET`, `OBJECT_STORAGE_REGION`, `OBJECT_STORAGE_ACCESS_KEY_ID`, `OBJECT_STORAGE_SECRET_ACCESS_KEY`: server-only storage settings.
- `EMAIL_PROVIDER_API_KEY`: server-only email provider key, when email workflows are introduced.

These names are a planning baseline and must be reconciled with actual library/provider requirements before implementation. Do not add real values to this file.

## Secret rules

- Never commit `.env.local`, real keys, tokens, database URLs, private keys, or production customer data.
- Keep server-only secrets out of variables prefixed with `NEXT_PUBLIC_`.
- Configure secrets through the hosting platform's environment settings.
- Use separate credentials for preview and production.
- Rotate leaked credentials immediately and inspect repository history if a secret is committed.
- Do not run production migrations until the migration, backup, and rollback plan has been reviewed.

## Deployment

The intended host is Vercel, with preview deployments for review and production deployment only after acceptance. Domain mapping, Core callback registration, database access policy, storage CORS, and HTTPS must be configured and verified for each environment. No deployment or live resource provisioning is part of this phase.

## Optional AI assistance

- `AI_GATEWAY_API_KEY`: server-side Vercel AI Gateway credential for loomifyAI. Never expose it to browser code.
- `LOOMIFYAI_MODEL`: model identifier selected for loomifyAI. If omitted, AI proposal generation remains unavailable; free manual website creation must continue to work.

The canonical product name is **loomifyAI**. The former `LOOMIFIAI_MODEL` variable is accepted temporarily for compatibility, but new deployments should use `LOOMIFYAI_MODEL`.
