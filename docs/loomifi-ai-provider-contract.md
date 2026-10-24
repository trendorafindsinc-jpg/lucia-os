# LoomifiAI provider contract

## Purpose

LoomifiAI is an optional website-creation assistant. It proposes a Loom Blueprint; LUCIA OS remains responsible for validation, tenant authorization, persistence, rendering, preview, and Go Live.

## Current foundation and proposal API

- `src/lib/loomifi-ai/provider.ts` defines the provider-neutral adapter contract.
- `src/lib/loomifi-ai/gateway.ts` adapts the Vercel AI Gateway OpenAI-compatible endpoint. The API key and model are server-only deployment settings: `AI_GATEWAY_API_KEY` and `LOOMIFIAI_MODEL`.
- The proposal pipeline bounds user briefs, applies a timeout, validates untrusted output with `loomBlueprintSchema`, and normalises provider failures.
- `POST /api/loomifi-ai/propose` requires a signed-in LUCIA OS session, an active organisation membership with `website.edit`, and a website belonging to that organisation.
- The route returns a validated proposal only. It does not persist a draft, create a version, or publish a website.
- If the Gateway settings are missing, it returns a recoverable `provider_unavailable` error. Loom Library and Studio remain usable without AI.

## Required next steps before general customer rollout

1. Build the Loom Studio proposal/review UI, with real request states and accessible error messages.
2. Present the validated proposal in the actual Loom renderer; do not persist it until the user explicitly chooses to apply/save it.
3. Save through the existing tenant-scoped draft API and version history; never publish automatically.
4. Test provider unavailability, timeouts, malformed output, cross-tenant access, duplicate retries, and draft/live preservation.
5. Configure the Gateway key and approved model in Vercel environment settings before enabling the feature. Do not commit credentials.

No production data, migrations, DNS, or live websites are changed by this proposal API.
