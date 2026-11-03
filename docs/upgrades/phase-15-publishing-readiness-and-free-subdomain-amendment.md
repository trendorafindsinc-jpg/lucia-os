# Phase 15 Amendment — Publishing Readiness and Free LUCIA Subdomains

**Repository:** `trendorafindsinc-jpg/lucia-os`  
**Target branch:** `upgrade/phase-15-content-media`  
**Related pull request:** #144  
**Status:** Approved product requirements; implementation pending  
**Scope:** Website publishing readiness and customer-controlled free LUCIA subdomains. This amendment extends Phase 15 and must reuse the existing website, domain, publishing and authorization architecture.

## 1. Purpose and product decisions

This amendment documents two customer-facing requirements:

1. Customers must be able to publish a functional website without being blocked by optional sample contact details or other recommendations.
2. Customers must be able to choose and later change the free LUCIA subdomain assigned to each website, with clear availability feedback.

These are two distinct capabilities. Neither changes the paid custom-domain product. The free LUCIA subdomain remains part of the standard free website publishing path.

Do not weaken genuine security, ownership, platform-integrity or legally required publishing checks. Do not expose placeholder/sample information as if it were real customer information.

## 2. Amendment A — Publishing readiness and optional content

### 2.1 Problem

A customer attempting to publish a website currently sees a blocking message similar to:

> Replace the sample contact email in Layout Studio before publishing. Your previous live version is unchanged.

A sample contact email is not, by itself, a technical or security requirement for publishing a website. Blocking publication because an optional contact field still contains sample content prevents customers from publishing a useful partial website.

### 2.2 Readiness classification

Introduce or refine a clear publishing-readiness model. Every check must be classified and presented accurately:

- **Required blocker:** A genuine technical, security, ownership, platform-integrity or legally mandatory condition that must be fixed before publication.
- **Recommendation:** A quality improvement that may be completed before or after publication. It must not block publishing.
- **Optional enhancement:** A feature or content improvement that is never required for a functional initial publication.

Examples (subject to auditing the actual product requirements):

| Check or content | Classification | Expected behavior |
|---|---|---|
| Website ownership/authorization | Required blocker | Prevent unauthorized publication |
| Valid supported website/domain binding | Required blocker | Prevent publication to an invalid or unverified host |
| Required platform/security validation | Required blocker | Block with a precise explanation |
| Sample contact email | Recommendation / content cleanup | Never block general website publication |
| Missing optional phone/address/social links | Recommendation | Never block |
| Missing optional SEO description, logo or favicon | Recommendation | Never block unless a specific feature genuinely requires it |
| No blog posts, news stories or testimonials | Optional enhancement | Never block |
| Extra pages, images or integrations | Optional enhancement | Never block |

The implementation must audit existing readiness checks and classify them by their actual necessity. Do not simply downgrade every existing blocker.

### 2.3 Sample content handling

- Sample/demo contact information must never be published as though it belongs to the customer.
- If a sample email is present in a visible contact section, offer a precise action to **Edit contact email** that opens the exact field in Layout Studio.
- Where supported, offer **Remove contact email** or allow the customer to hide/remove the optional contact item or section.
- If the entire contact section is optional, allow the customer to hide/remove it and publish the rest of the website.
- Re-evaluate readiness after the customer saves a change.
- If the customer leaves sample content visible, publication must not silently expose it. The system must require replacement/removal or safely suppress the placeholder from public output, with clear customer feedback.
- Never silently replace a sample address with an invented email address.

### 2.4 Actionable readiness interface

For each recommendation or blocker:

- Explain what is wrong, why it matters and whether it prevents publication.
- Provide a direct action that opens the exact relevant setting, page or editor field; avoid sending customers to a generic settings landing page.
- Clearly distinguish **Publish blocked** from **Ready to publish** and **Recommended improvements**.
- Preserve the customer's editing session and saved progress when navigating to fix an issue.
- Recheck readiness after a successful save and before final publication.
- Network failures, stale state and save conflicts must not erase customer work.
- Keep the previous live version unchanged if a genuine required blocker prevents publication; explain that behavior clearly.

### 2.5 Acceptance criteria

- A website with no contact email can be published when no service-specific requirement makes that email mandatory.
- A website with optional fields/pages/features incomplete can still be published.
- Sample contact information is never exposed publicly as customer-owned information.
- The customer can navigate directly to the exact field or remove/hide the optional content.
- Readiness updates after changes without requiring a full restart of the publishing journey.
- Genuine ownership, host-binding, security and required platform checks still block publication.
- Tests cover each classification, sample-content suppression/replacement, direct editor navigation, save failures, stale state and publication behavior.
- Browser acceptance proves the real customer journey and verifies the public output, not only a mocked readiness panel.

## 3. Amendment B — Customer-controlled free LUCIA subdomain

### 3.1 Product scope

Every website can use its free LUCIA-hosted subdomain, for example:

`estifin-school-of-business-a682e65291.lucia.name.ng`

Customers must be able to choose a memorable available subdomain and change it later. This requirement concerns only the free LUCIA subdomain.

**Explicit exclusions:**
- This is not a custom-domain connection flow.
- Do not charge the customer for selecting or changing a free LUCIA subdomain.
- Do not route the customer to the paid custom-domain purchase path.
- Do not create a second website when a customer renames the subdomain.

### 3.2 Customer experience

#### Website creation

- Allow the customer to choose a preferred subdomain during website creation.
- Generate a sensible suggested name from the website name when possible.
- Make it clear that the value is the free address ending in `.lucia.name.ng`.
- Let the customer edit the subdomain before creation.
- Show availability feedback and explain invalid, unavailable or reserved names.

#### Existing websites

- Add a clearly named **Free LUCIA address** or **LUCIA subdomain** setting in the existing website settings area.
- Display the current subdomain and allow the authorized website owner to request a new one.
- Show the resulting full address before confirmation.
- Explain that changing the address changes the website's public URL.
- Do not make a custom domain appear editable through this control.

#### Availability states

The selector must distinguish at least:

- **Available:** Valid and currently eligible to claim.
- **Taken:** Already assigned to another website.
- **Reserved:** Protected by the platform and not claimable.
- **Invalid:** Does not meet the subdomain naming rules.
- **Checking / unavailable to verify:** The availability service has not completed or cannot be reached; do not falsely show the name as available.

Where practical, offer alternative suggestions when a requested name is taken. Suggestions must be checked through the same authoritative availability mechanism and must not be represented as claimable until verified.

### 3.3 Naming and reservation rules

Inspect the existing domain model and platform routing before defining or changing normalization rules. Document the actual supported character set and length limits.

At minimum:

- Normalize names consistently (including case handling) before checking or storing them.
- Reject empty names, malformed labels, invalid characters and unsupported lengths.
- Protect reserved platform labels and routes, including administrative and infrastructure names such as `admin`, `api` and `staff`, plus any existing platform-reserved names.
- Prevent collisions with existing active websites, domains, aliases and reserved names.
- Treat availability checks as advisory only; the server-side claim operation is authoritative.
- Enforce uniqueness atomically at the database/domain layer or through an equivalent race-safe transaction. Two customers must not be able to claim the same name concurrently.
- Recheck availability when saving/claiming; never trust a client-side result.
- Return safe, actionable conflict responses if a name becomes unavailable between check and save.

### 3.4 Rename behavior and URL continuity

Before implementation, trace the existing `website_domains` model, host resolution, public website routing, canonical URL/SEO handling, caching, redirects and any existing slug/domain redirect model.

When a subdomain changes:

- Update the existing website's free-host binding without creating a new website or resetting its content.
- Preserve website identity, ownership, pages, layout, settings, Blog/News content, media, revisions, publication state and history.
- Make the new host resolve to the same website after the change is committed.
- Where technically supported by the current domain architecture, preserve the old free subdomain as a redirect to the new canonical address. Use a safe permanent redirect only when the old host can be retained and resolved unambiguously.
- If old-host redirects are not supported by the current model/platform, document the limitation and implement the safest supported transition rather than inventing a parallel redirect system.
- Ensure canonical URLs, sitemap/SEO output and internal links reflect the new canonical host.
- Invalidate or revalidate relevant host-resolution and page caches so the new address works promptly and the old address does not serve stale content.
- Ensure old-host behavior cannot expose a different tenant's website or bypass host-binding authorization.

The exact redirect strategy must be based on the existing architecture and verified in browser/network tests. Do not claim SEO continuity without evidence.

### 3.5 Authorization and security

- Only an authorized owner or role permitted by the existing website access model may change the subdomain.
- Reuse existing LUCIA Core identity and OS website authorization; do not add another auth system.
- Preserve tenant isolation and active host-binding requirements.
- Prevent host-header spoofing, untrusted host resolution, cross-tenant aliasing and reserved-route takeover.
- Audit/log successful changes and meaningful failed claim attempts using existing audit facilities where available.
- Do not reveal the identity or private details of the customer who owns a taken name.

### 3.6 Acceptance criteria

- A customer can choose an available free subdomain during website creation.
- A customer can check a taken, reserved and invalid name and receives the correct distinct state.
- A customer can change an existing website's free LUCIA subdomain from website settings.
- The operation updates the same website and preserves all content, media, layout, revisions and publication history.
- Concurrent claims cannot produce duplicate active subdomains.
- Server-side validation and authorization are tested; client-only checks do not count.
- The new host resolves to the correct website and public pages.
- Old-host redirect/transition behavior is tested if supported; any unsupported behavior is documented honestly.
- Canonical URL, sitemap/internal links and cache behavior are verified.
- Tests prove a customer cannot claim reserved names or alter another tenant's website.
- The flow is responsive and accessible on phone and desktop.
- This free subdomain capability has no custom-domain fee or purchase requirement.

## 4. Shared implementation and architecture constraints

- Implement both amendments on the existing Phase 15 branch `upgrade/phase-15-content-media` and PR #144.
- Audit existing source, routes, data models, APIs, migrations, domain resolution and publishing checks before coding.
- Reuse existing website records, domain binding, authorization, publishing engine, audit facilities and redirect infrastructure wherever possible.
- Do not introduce duplicate website, domain, CMS, authentication, scheduler or media systems.
- Do not change production data or apply a migration without a demonstrated requirement, a documented migration plan and explicit operational verification.
- Production migrations 0016–0029 have already been applied and the Drizzle journal synchronized; do not reapply them.
- If schema changes are genuinely required, create a new forward-only migration with safe uniqueness/backfill handling and document rollback considerations.
- Do not weaken RLS, host binding, tenant isolation, publication security or existing public-route protections.
- Do not merge PR #144 without the user's explicit approval.

## 5. Required implementation and verification sequence

1. Inspect the Phase 15 branch and existing PR changes; identify the actual publishing readiness checks and free-subdomain/domain architecture.
2. Document the source files, routes, APIs, data model and existing behavior relevant to both amendments.
3. Implement publishing-readiness classification and safe sample-content handling.
4. Implement free-subdomain selection, availability checking, race-safe claiming and existing-site rename.
5. Integrate the experiences into the existing website creation/settings and publish flows.
6. Add unit, integration, database/security and browser acceptance tests.
7. Exercise real customer journeys against the deployed or otherwise representative environment; distinguish automated mocks from live service evidence.
8. Verify public website output, host resolution, redirects (if supported), canonical URLs, cache invalidation and tenant isolation.
9. Report changed files, commits, migration status, tests, browser evidence, remaining blockers and exact release readiness.

## 6. Definition of done

Both amendments are complete only when:

- Optional sample content and recommendations no longer prevent a customer from publishing a functional website, while genuine mandatory checks remain enforced and sample information cannot leak publicly.
- Customers can select and change their free LUCIA subdomain with accurate availability feedback, race-safe server-side enforcement and verified website/host continuity.
- Existing Phase 15 Publishing Studio functionality and all existing website content remain intact.
- Security, tenant isolation, public rendering and customer journeys have real test evidence.
- No duplicate backend or paid custom-domain dependency has been introduced.

**Approval boundary:** This document records the approved product requirements. Implementation and verification are still required. PR #144 must remain unmerged until the user explicitly approves merging.
