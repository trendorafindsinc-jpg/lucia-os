import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasOrganizationPermission } from "@/lib/access/policy";
import { getDb } from "@/lib/db/client";
import { memberships, organizations, websiteDomains, websitePages, websites } from "@/lib/db/schema";
import { makeInitialDraft, siteDraftSchema } from "@/lib/editor/site-draft";
import { publishSettingsSchema } from "@/lib/publishing/publishing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return jsonError("This publishing request did not come from LUCIA OS.", 403);
  const user = await getCurrentUser().catch(() => null);
  if (!user) return jsonError("Sign in with LUCIA ID before saving or publishing your website.", 401);
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError("Submit valid website details.", 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return jsonError("Submit valid website details.", 400);
  const requestedAction = (body as Record<string, unknown>).action;
  if (requestedAction !== "save" && requestedAction !== "publish") return jsonError("Choose an explicit save or publish action.", 400);
  const action = requestedAction;
  const parsed = publishSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Review your website details before saving.", issues: parsed.error.flatten() }, { status: 422, headers: { "Cache-Control": "no-store" } });
  }
  const settings = parsed.data;
  let db: ReturnType<typeof getDb>;
  try { db = getDb(); } catch { return jsonError("Website storage is not configured. Your changes have not been published.", 503); }

  let orgRows: Array<{ id: string; role: string; membershipStatus: string }>;
  try {
    orgRows = await db.select({
      id: organizations.id, role: memberships.role, membershipStatus: memberships.status,
    }).from(memberships).innerJoin(organizations, eq(memberships.organizationId, organizations.id))
      .where(and(eq(memberships.userId, user.id), eq(memberships.status, "active"), eq(organizations.status, "active")));
  } catch { return jsonError("We couldn't verify your organisation access. Please try again.", 503); }

  const requiredPermission = action === "save" ? "website.edit" : "website.publish";
  const permitted = orgRows.filter((org) => hasOrganizationPermission({ role: org.role, status: org.membershipStatus }, requiredPermission));
  if (permitted.length === 0) return jsonError("You need an active organisation membership with website publishing permission.", 403);

  for (const org of permitted) {
    try {
      const result = await db.transaction(async (tx) => {
        await tx.execute(sql`select set_config('app.current_organization_id', ${org.id}, true)`);
        const [website] = await tx.select({
          id: websites.id, organizationId: websites.organizationId, slug: websites.slug, status: websites.status,
        }).from(websites).where(and(eq(websites.organizationId, org.id), eq(websites.slug, settings.siteSlug))).limit(1);
        if (!website) return null;
        const pages = await tx.select({
          id: websitePages.id, title: websitePages.title, path: websitePages.path, content: websitePages.content,
        }).from(websitePages).where(and(eq(websitePages.organizationId, org.id), eq(websitePages.websiteId, website.id)));
        const home = pages.find((page) => page.path === "/") ?? pages[0];
        let currentDraft: unknown = makeInitialDraft("northstar-consulting");
        if (home?.content) {
          try {
            const valid = siteDraftSchema.safeParse(JSON.parse(home.content) as unknown);
            if (valid.success) currentDraft = valid.data;
          } catch { /* Legacy plain text is not trusted as a structured draft. */ }
        }
        const draftResult = siteDraftSchema.safeParse({
          ...(currentDraft as Record<string, unknown>),
          siteName: settings.siteName, headline: settings.headline, description: settings.description,
        });
        if (!draftResult.success) throw new Error("The saved website draft is incomplete. Open the visual editor and save a valid draft first.");
        const snapshot = JSON.stringify(draftResult.data);
        const now = new Date();

        if (action === "save") {
          if (home) {
            await tx.update(websitePages).set({ title: "Home", content: snapshot, updatedAt: now })
              .where(and(eq(websitePages.id, home.id), eq(websitePages.organizationId, org.id), eq(websitePages.websiteId, website.id)));
          } else {
            await tx.insert(websitePages).values({ organizationId: org.id, websiteId: website.id, title: "Home", path: "/", status: "draft", content: snapshot, updatedAt: now });
          }
          await tx.update(websites).set({ name: settings.siteName, updatedAt: now }).where(and(eq(websites.id, website.id), eq(websites.organizationId, org.id)));
          return { action, id: website.id, slug: website.slug, name: settings.siteName, status: website.status, savedAt: now.toISOString() };
        }

        // The public renderer expects a validated site-draft snapshot for every
        // published path. Previously only "/" received one, leaving seeded
        // About/Services/Contact routes permanently 404 after publishing.
        if (pages.length === 0) {
          await tx.insert(websitePages).values({
            organizationId: org.id, websiteId: website.id, title: "Home", path: "/", status: "published",
            content: snapshot, publishedContent: snapshot, updatedAt: now,
          });
        } else {
          for (const page of pages) {
            const isHome = page.path === "/";
            await tx.update(websitePages).set({
              ...(isHome ? { title: "Home", content: snapshot } : {}),
              publishedContent: snapshot,
              status: "published",
              updatedAt: now,
            }).where(and(
              eq(websitePages.id, page.id),
              eq(websitePages.organizationId, org.id),
              eq(websitePages.websiteId, website.id),
            ));
          }
        }
        await tx.update(websites).set({ name: settings.siteName, status: "published", publishedAt: now, updatedAt: now })
          .where(and(eq(websites.id, website.id), eq(websites.organizationId, org.id)));

        // Publishing owns the free LUCIA subdomain lifecycle: activate its exact
        // hostname in the same transaction as the published snapshot. Wildcard
        // DNS is only transport; routing still requires this exact active record.
        const siteDomain = (process.env.LUCIA_SITE_DOMAIN || "lucia.name.ng")
          .trim().toLowerCase().replace(/^\*\./, "").replace(/^\./, "").replace(/\.$/, "");
        const hostname = website.slug + "." + siteDomain;
        const [existingDomain] = await tx.select({
          id: websiteDomains.id,
          organizationId: websiteDomains.organizationId,
          websiteId: websiteDomains.websiteId,
          domainType: websiteDomains.domainType,
        }).from(websiteDomains).where(eq(websiteDomains.hostname, hostname)).limit(1);
        if (existingDomain && (
          existingDomain.organizationId !== org.id ||
          existingDomain.websiteId !== website.id ||
          existingDomain.domainType !== "lucia_subdomain"
        )) {
          throw new Error("The requested LUCIA hostname is already owned by another website.");
        }
        if (existingDomain) {
          await tx.update(websiteDomains).set({
            status: "active",
            verifiedAt: now,
            updatedAt: now,
          }).where(and(
            eq(websiteDomains.id, existingDomain.id),
            eq(websiteDomains.organizationId, org.id),
            eq(websiteDomains.websiteId, website.id),
          ));
        } else {
          await tx.insert(websiteDomains).values({
            organizationId: org.id,
            websiteId: website.id,
            hostname,
            domainType: "lucia_subdomain",
            status: "active",
            verifiedAt: now,
            isPrimary: false,
            updatedAt: now,
          });
        }
        return {
          action, id: website.id, slug: website.slug, name: settings.siteName, status: "published",
          publishedAt: now.toISOString(), publishedPageCount: Math.max(pages.length, 1),
        };
      });

      if (!result) continue;
      if (action === "save") return NextResponse.json({ saved: true, website: result }, { headers: { "Cache-Control": "no-store" } });
      const domain = (process.env.LUCIA_SITE_DOMAIN || "lucia.name.ng").trim().replace(/^\*\./, "");
      return NextResponse.json({
        published: true, website: result, url: "https://" + result.slug + "." + domain,
        customDomain: settings.customDomain
          ? { status: "pending_activation", message: "No custom-domain payment was taken. Its separate one-time activation and DNS/TLS verification are not connected yet." }
          : { status: "not_requested" },
      }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (/requested LUCIA hostname is already owned|unique constraint|duplicate key|websites_published_slug_uq/i.test(message)) return jsonError("That LUCIA address is already claimed. Choose another address or open the website that owns it.", 409);
      if (/saved website draft is incomplete/i.test(message)) return jsonError(message, 422);
      return jsonError("We couldn't save or publish the website right now. Your previous live version has been preserved. Please try again shortly.", 503);
    }
  }
  return jsonError("No saved website matches this LUCIA address in an organisation you can publish for. Create the website first, then enter its exact address here.", 404);
}
