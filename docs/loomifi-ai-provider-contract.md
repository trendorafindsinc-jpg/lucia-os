# LoomifiAI provider contract

## Purpose

LoomifiAI is an optional website-creation assistant. It proposes a Loom Blueprint; LUCIA OS remains responsible for validation, tenant authorization, persistence, rendering, preview, and Go Live.

## Current foundation

- `src/lib/loomifi-ai/provider.ts` defines a provider-neutral adapter contract.
- The proposal pipeline bounds user briefs, applies a timeout, validates untrusted output with `loomBlueprintSchema`, and normalises provider failures.
- It does not save a draft or publish a website.
- If no provider is configured, it returns a recoverable `provider_unavailable` error. Loom Library and Studio remain usable without AI.

## Required next steps before user-facing generation

1. Implement a provider adapter behind this contract, using the approved LUCIA/Vercel AI Gateway configuration; do not hardcode a model provider into the website renderer.
2. Add a tenant-authorized API route that checks `website.edit` access on the selected saved website.
3. Show real stages and errors, not timer-based progress.
4. Present the validated proposal as a reviewable preview; do not persist it until the user explicitly chooses to apply/save it.
5. Save through the existing tenant-scoped draft API and version history; never publish automatically.
6. Test provider unavailability, timeouts, malformed output, cross-tenant access, duplicate retries, and draft/live preservation.

No provider credentials, production data, or live websites are changed by this foundation.
