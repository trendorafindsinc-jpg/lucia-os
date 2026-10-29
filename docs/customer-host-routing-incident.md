# Customer hostname routing incident — issue #112

2026-10-29. Scope: repair customer hostname routing, separate from Phase 4 visuals.

## Observed cause
- Browser navigation to https://ores-agric.lucia.name.ng/ retained that hostname but rendered the LUCIA OS marketing page.
- The existing public rendering path https://os.lucia.name.ng/site/ores-agric successfully rendered published website content. Publication was readable under the existing runtime; no database mutation was required to diagnose this routing failure.
- Vercel project lucia-os production deployment at 01a6805 was READY. The wildcard and OS domains were verified with no redirects. Project-level routes were empty.
- Local production builds from the same source had an empty middleware manifest. Next.js 15.5.28 finds middleware beside its app/pages directory; this repo uses src/app but had middleware.ts at repository root. Earlier unit tests imported that file directly and therefore did not detect its omission from deployment.
- Once middleware was activated, the compiled-server test also exposed Next.js's internal request origin. Routing now uses the original HTTP Host rather than assuming nextUrl.hostname is the external hostname. Forwarded-host input is not trusted to choose platform routes.

## Fix
- Move the single middleware entrypoint to src/middleware.ts and update its tests.
- Preserve wildcard/custom-domain public routing, published-only renderers and private-path denials. Allow the project's explicit Vercel aliases plus provider-configured deployment/branch hostnames; unrelated Vercel domains are not platform hosts. Localhost bypass is development-only.
- The build command now fails unless the production manifest contains the middleware. CI also starts the compiled production server and sends real HTTP requests with different Host values.

## Local verification
- Lint: passed with existing warnings only.
- TypeScript and Next production build: passed; Middleware 34.9 kB is included.
- Unit tests: 43 files / 305 tests passed.
- Drizzle migration consistency: passed; no migrations changed.
- Compiled production HTTP checks: platform landing 200, tenant roots/nested paths and unregistered custom domains fail closed without DB credentials, reserved/nested hostnames rejected, tenant API/internal/staff access does not reach platform pages, forwarded-host spoof rejected, generated assets remain available. These tests use no customer database and do not claim positive database-backed tenant rendering.

## Release and remaining evidence
Keep issue #112 open until the corrected deployment is live and the original customer URL renders the same published website content while os.lucia.name.ng still serves LUCIA OS. Inspect CI and preview status on the exact PR head before merge. No DNS, secrets, production database records, RLS policies or LUCIA Core were changed.

Reference: https://nextjs.org/docs/15/app/api-reference/file-conventions/middleware (middleware must be at the same level as app/pages).
