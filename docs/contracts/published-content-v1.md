# LUCIA published-content contract v1

**Endpoint:** `GET /api/public/v1/content` on the customer's published hostname.

The endpoint is read-only and host-resolved. It returns only records whose publication status is `published` for the website bound to the request Host. It never returns drafts, scheduled records, organization IDs, author IDs, credentials or internal media object keys.

## Response

- `contract`: `lucia.published-content.v1` (consumers must reject unknown major versions).
- `site`: public site name and canonical hostname.
- `content.blog[]` and `content.news[]`: published article title, stable slug/route, excerpt, Markdown body, category, tags, public author display name, event time, featured state, correction notice/reference, SEO metadata, publication time and a public featured-media reference/URL/alt description.

Consumers must render Markdown through an allow-list sanitizer, use only the returned public media URL, preserve article routes, and must not infer that a draft or scheduled item exists. Code Studio should consume this contract instead of connecting to PostgreSQL or receiving credentials. Add a new `v2` endpoint/version for breaking schema changes; do not silently change v1 semantics.

The same published-only data powers the built-in homepage highlights and Blog/News indexes, so custom code and built-in Layouts share one public contract.
