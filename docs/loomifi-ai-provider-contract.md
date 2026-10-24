# LoomifiAI provider contract

## Purpose

LoomifiAI is an optional website-creation assistant. It proposes a Loom Blueprint; LUCIA OS remains responsible for validation, tenant authorization, persistence, rendering, preview, and Go Live.

## Current foundation and proposal API

- `src/lib/loomifi-ai/provider.ts` defines the provider-neutral adapter contract, brief validation, timeout handling, and safe error normalization.
- `src/lib/loomifi-ai/gateway.ts` adapts the Vercel AI Gateway OpenAI-compatible endpoint. The API key and model are server-only deployment settings: `AI_GATEWAY_API_KEY` and `LOOMIFIAI_MODEL`.
- `POST /api/loomifi-ai/propose` requires a signed-in LUCIA OS session, an active organisation membership with `website.edit`, and a website belonging to that organisation.
- Provider output is validated against `loomBlueprintSchema` before being returned.
- The Loom Studio UI displays the proposal through the real Loom renderer. The user must explicitly choose **Apply to editor**; that changes unsaved editor fields only. Saving a draft and publishing remain separate actions.
- The proposal endpoint does not persist a draft, create a version, or publish a website. Responses are marked `persisted: false` and `published: false`, with `Cache-Control: no-store`.
- Without Gateway settings, the endpoint returns a recoverable provider-unavailable error. Loom Library and non-AI Studio editing remain available.

## Verification completed

- Provider-neutral tests cover invalid briefs, missing providers, malformed blueprints, timeouts, and provider failure redaction.
- Gateway adapter tests cover request construction, missing configuration, malformed responses, and safe error handling.
- Route-level tests cover unauthenticated access, cross-origin requests, viewer denial, cross-tenant website denial, malformed input, and the authorized editor path.
- GitHub Quality checks passed for branch head `2811a5b10af1654c42a623523b58cbfe3e430d47`.
- Its Vercel preview deployment is READY and `/editor` returns HTTP 200. This is an HTTP smoke test, not a full interactive visual review.

## Remaining release gates

1. Configure `AI_GATEWAY_API_KEY` and `LOOMIFIAI_MODEL` in Vercel Preview first, then test a real provider request. Keep the key server-side and never commit it.
2. Perform a signed-in end-to-end test against a saved website: generate a proposal, inspect it, apply it, verify the draft remains unsaved until the user saves, and confirm the live site is unchanged until an explicit publish.
3. Complete interactive visual review at mobile and desktop sizes, including loading, provider-unavailable, timeout, and malformed-output states.
4. Re-run the quality checks and preview smoke test after any resulting changes.

Keep the feature out of general customer rollout until the remaining gates pass. No production database migration, DNS change, or customer website content change is part of this foundation.
