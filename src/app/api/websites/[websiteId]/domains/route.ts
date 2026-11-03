import { ne, and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentOrganizationAccess } from "@/lib/access/guards";
import { getDb } from "@/lib/db/client";
import { platformAuditEvents, websiteDomains, websites } from "@/lib/db/schema";
import { classifyWebsiteHostname } from "@/lib/domains/hostname";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ websiteId: string }> };

function jsonError(error: string, status: number) {
  return NextResponse.json(
    { error },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: Request, context: RouteContext) {
  const { websiteId } = await context.params;
  const url = new URL(request.url);
  const requestedSubdomain = url.searchParams.get("subdomain");
  if (requestedSubdomain !== null) {
    const siteDomain = (process.env.LUCIA_SITE_DOMAIN || "lucia.name.ng")
      .trim().toLowerCase().replace(/^\*\./, "").replace(/^\./, "").replace(/\.$/, "");
    let claim: ReturnType<typeof classifyWebsiteHostname>;
    try {
      claim = classifyWebsiteHostname(requestedSubdomain + "." + siteDomain);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid subdomain.";
      return NextResponse.json({
        available: false,
        state: /reserved/i.test(message) ? "reserved" : "invalid",
        message,
      }, { headers: { "Cache-Control": "no-store" } });
    }
    const excludeWebsiteId = url.searchParams.get("excludeWebsiteId");
    if (excludeWebsiteId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(excludeWebsiteId))
      return jsonError("Invalid website reference.", 400);
    const db = getDb();
    const rows = await db.execute(sql`SELECT public.lucia_website_hostname_available(
      ${claim.hostname}, ${excludeWebsiteId}::uuid
    ) AS available`);
    const available = Boolean((rows as unknown as Array<{ available: boolean }>)[0]?.available);
    return NextResponse.json({
      available,
      state: available ? "available" : "taken",
      hostname: claim.hostname,
    }, { headers: { "Cache-Control": "no-store" } });
  }
  const organizationId = url.searchParams.get("organizationId");
  if (!organizationId) return jsonError("organizationId is required.", 400);
  const access = await getCurrentOrganizationAccess(
    organizationId,
    "website.read",
  );
  if (!access) return jsonError("Organisation access denied.", 403);

  const db = getDb();
  const rows = await db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('app.current_organization_id', ${access.membership.organizationId}, true)`,
    );
    const [site] = await tx
      .select({ id: websites.id })
      .from(websites)
      .where(
        and(
          eq(websites.id, websiteId),
          eq(websites.organizationId, access.membership.organizationId),
          ne(websites.status, "deleted"),
        ),
      )
      .limit(1);
    if (!site) return null;
    return tx
      .select({
        id: websiteDomains.id,
        hostname: websiteDomains.hostname,
        type: websiteDomains.domainType,
        status: websiteDomains.status,
        isPrimary: websiteDomains.isPrimary,
        verifiedAt: websiteDomains.verifiedAt,
        createdAt: websiteDomains.createdAt,
      })
      .from(websiteDomains)
      .where(
        and(
          eq(websiteDomains.websiteId, site.id),
          eq(websiteDomains.organizationId, access.membership.organizationId),
        ),
      );
  });
  if (!rows) return jsonError("Website not found.", 404);
  return NextResponse.json(
    { domains: rows },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request, context: RouteContext) {
  const { websiteId } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }
  if (!body || typeof body !== "object")
    return jsonError("Invalid domain details.", 400);
  const input = body as Record<string, unknown>;
  if (
    typeof input.organizationId !== "string" ||
    typeof input.hostname !== "string"
  ) {
    return jsonError("organizationId and hostname are required.", 400);
  }

  const access = await getCurrentOrganizationAccess(
    input.organizationId,
    "website.edit",
  );
  if (!access) return jsonError("Organisation access denied.", 403);

  let claim: ReturnType<typeof classifyWebsiteHostname>;
  try {
    claim = classifyWebsiteHostname(input.hostname);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Invalid hostname.",
      400,
    );
  }
  if (claim.type === "custom") {
    // Fail closed: the LUCIA Store one-time access verifier is not connected.
    // Identity and tenant authorization cannot stand in for a verified purchase.
    return jsonError(
      "Custom-domain activation requires the separate ₦5,000 one-time LUCIA Store purchase and ownership verification. Purchase verification is not connected yet.",
      503,
    );
  }

  const db = getDb();
  try {
    const created = await db.transaction(async (tx) => {
      await tx.execute(
        sql`select set_config('app.current_organization_id', ${access.membership.organizationId}, true)`,
      );
      const [site] = await tx
        .select({
          id: websites.id,
          slug: websites.slug,
          status: websites.status,
        })
        .from(websites)
        .where(
          and(
            eq(websites.id, websiteId),
            eq(websites.organizationId, access.membership.organizationId),
          ne(websites.status, "deleted"),
          ),
        )
        .limit(1);
      if (!site) return { missing: true as const };
      const siteDomain = (process.env.LUCIA_SITE_DOMAIN || "lucia.name.ng")
        .trim()
        .toLowerCase()
        .replace(/^\*\./, "")
        .replace(/^\./, "")
        .replace(/\.$/, "");
      if (claim.hostname !== site.slug + "." + siteDomain) {
        return { invalidSubdomain: true as const };
      }

      const [domain] = await tx
        .insert(websiteDomains)
        .values({
          organizationId: access.membership.organizationId,
          websiteId: site.id,
          hostname: claim.hostname,
          domainType: claim.type,
          // A requested hostname is not proof of ownership. Keep it non-routable
          // until a separate server-side verification/activation flow succeeds.
          status: "pending",
          isPrimary: input.isPrimary === true,
        })
        .returning({
          id: websiteDomains.id,
          hostname: websiteDomains.hostname,
          type: websiteDomains.domainType,
          status: websiteDomains.status,
          isPrimary: websiteDomains.isPrimary,
        });
      await tx.insert(platformAuditEvents).values({
        actorUserId: access.user.id,
        actorKind: "tenant",
        organizationId: access.membership.organizationId,
        action: "website.domain.claim_requested",
        targetType: "website_domain",
        targetId: domain.id,
        purpose: "website.domain.manage",
        result: "success",
        metadata: JSON.stringify({
          hostname: domain.hostname,
          domainType: domain.type,
          status: domain.status,
        }),
      });
      return { domain };
    });
    if ("missing" in created) return jsonError("Website not found.", 404);
    if ("invalidSubdomain" in created)
      return jsonError(
        "The free LUCIA subdomain must match this website's published address.",
        400,
      );
    return NextResponse.json(
      { domain: created.domain },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (
      message.includes("website_domains_hostname_uq") ||
      message.includes("duplicate key")
    ) {
      return jsonError("That hostname is already claimed.", 409);
    }
    if (message.includes("website_domains_one_primary_per_site_uq")) {
      return jsonError("This website already has a primary domain.", 409);
    }
    return jsonError("Could not claim this hostname.", 400);
  }
}


export async function PATCH(request: Request, context: RouteContext) {
  const { websiteId } = await context.params;
  let body: unknown;
  try { body = await request.json(); }
  catch { return jsonError("Request body must be valid JSON.", 400); }
  if (!body || typeof body !== "object" || Array.isArray(body))
    return jsonError("Invalid free LUCIA address details.", 400);
  const input = body as Record<string, unknown>;
  if (typeof input.organizationId !== "string" || typeof input.subdomain !== "string")
    return jsonError("organizationId and subdomain are required.", 400);
  const access = await getCurrentOrganizationAccess(input.organizationId, "website.edit");
  if (!access) return jsonError("Organisation access denied.", 403);
  const siteDomain = (process.env.LUCIA_SITE_DOMAIN || "lucia.name.ng")
    .trim().toLowerCase().replace(/^\*\./, "").replace(/^\./, "").replace(/\.$/, "");
  let claim: ReturnType<typeof classifyWebsiteHostname>;
  try { claim = classifyWebsiteHostname(input.subdomain + "." + siteDomain); }
  catch (error) {
    return jsonError(error instanceof Error ? error.message : "Invalid subdomain.", 400);
  }
  const db = getDb();
  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.current_organization_id', ${access.membership.organizationId}, true)`);
      const [site] = await tx.select({
        id: websites.id, slug: websites.slug, status: websites.status,
      }).from(websites).where(and(
        eq(websites.id, websiteId),
        eq(websites.organizationId, access.membership.organizationId),
        ne(websites.status, "deleted"),
      )).limit(1).for("update");
      if (!site) return { missing: true as const };
      const [current] = await tx.select({
        id: websiteDomains.id, hostname: websiteDomains.hostname,
      }).from(websiteDomains).where(and(
        eq(websiteDomains.organizationId, access.membership.organizationId),
        eq(websiteDomains.websiteId, websiteId),
        eq(websiteDomains.domainType, "lucia_subdomain"),
        ne(websiteDomains.status, "removed"),
      )).limit(1).for("update");
      if (site.slug === claim.subdomain && current?.hostname === claim.hostname)
        return { hostname: claim.hostname, slug: claim.subdomain!, unchanged: true as const };
      const now = new Date();
      if (current) {
        await tx.update(websiteDomains).set({
          hostname: claim.hostname,
          status: site.status === "published" ? "active" : "pending",
          verifiedAt: site.status === "published" ? now : null,
          updatedAt: now,
        }).where(and(
          eq(websiteDomains.id, current.id),
          eq(websiteDomains.organizationId, access.membership.organizationId),
          eq(websiteDomains.websiteId, websiteId),
        ));
      } else {
        await tx.insert(websiteDomains).values({
          organizationId: access.membership.organizationId,
          websiteId,
          hostname: claim.hostname,
          domainType: "lucia_subdomain",
          status: site.status === "published" ? "active" : "pending",
          verifiedAt: site.status === "published" ? now : null,
          isPrimary: false,
          updatedAt: now,
        });
      }
      await tx.update(websites).set({ slug: claim.subdomain!, updatedAt: now })
        .where(and(
          eq(websites.id, websiteId),
          eq(websites.organizationId, access.membership.organizationId),
        ));
      await tx.insert(platformAuditEvents).values({
        actorUserId: access.user.id,
        actorKind: "tenant",
        organizationId: access.membership.organizationId,
        action: "website.lucia_subdomain.renamed",
        targetType: "website",
        targetId: websiteId,
        purpose: "website.domain.manage",
        result: "success",
        metadata: JSON.stringify({ previousHostname: current?.hostname ?? null, hostname: claim.hostname }),
      });
      return { hostname: claim.hostname, slug: claim.subdomain!, unchanged: false as const };
    });
    if ("missing" in result) return jsonError("Website not found.", 404);
    return NextResponse.json({ domain: result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("website_domains_hostname_uq") || message.includes("websites_published_slug_uq") || message.includes("duplicate key"))
      return jsonError("That free LUCIA address has already been claimed. Choose another.", 409);
    return jsonError("The free LUCIA address could not be changed.", 400);
  }
}
