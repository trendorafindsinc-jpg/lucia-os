import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentOrganizationAccess } from "@/lib/access/guards";
import { getDb } from "@/lib/db/client";
import { platformAuditEvents, websiteDomains, websites } from "@/lib/db/schema";
import { classifyWebsiteHostname } from "@/lib/domains/hostname";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ websiteId: string }> };

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request, context: RouteContext) {
  const { websiteId } = await context.params;
  const organizationId = new URL(request.url).searchParams.get("organizationId");
  if (!organizationId) return jsonError("organizationId is required.", 400);
  const access = await getCurrentOrganizationAccess(organizationId, "website.read");
  if (!access) return jsonError("Organisation access denied.", 403);

  const db = getDb();
  const rows = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_organization_id', ${access.membership.organizationId}, true)`);
    const [site] = await tx.select({ id: websites.id })
      .from(websites)
      .where(and(eq(websites.id, websiteId), eq(websites.organizationId, access.membership.organizationId)))
      .limit(1);
    if (!site) return null;
    return tx.select({
      id: websiteDomains.id,
      hostname: websiteDomains.hostname,
      type: websiteDomains.domainType,
      status: websiteDomains.status,
      isPrimary: websiteDomains.isPrimary,
      verifiedAt: websiteDomains.verifiedAt,
      createdAt: websiteDomains.createdAt,
    }).from(websiteDomains)
      .where(and(eq(websiteDomains.websiteId, site.id), eq(websiteDomains.organizationId, access.membership.organizationId)));
  });
  if (!rows) return jsonError("Website not found.", 404);
  return NextResponse.json({ domains: rows }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, context: RouteContext) {
  const { websiteId } = await context.params;
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError("Request body must be valid JSON.", 400); }
  if (!body || typeof body !== "object") return jsonError("Invalid domain details.", 400);
  const input = body as Record<string, unknown>;
  if (typeof input.organizationId !== "string" || typeof input.hostname !== "string") {
    return jsonError("organizationId and hostname are required.", 400);
  }

  const access = await getCurrentOrganizationAccess(input.organizationId, "website.edit");
  if (!access) return jsonError("Organisation access denied.", 403);

  let claim: ReturnType<typeof classifyWebsiteHostname>;
  try {
    claim = classifyWebsiteHostname(input.hostname);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Invalid hostname.", 400);
  }
  if (claim.type === "custom") {
    // Fail closed: this deployment has no verified Core-tenant mapping and
    // entitlement-check client yet. Never infer Premium from browser input.
    return jsonError("Custom-domain claims are temporarily unavailable until LUCIA Core entitlement verification is connected.", 503);
  }

  const db = getDb();
  try {
    const created = await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.current_organization_id', ${access.membership.organizationId}, true)`);
      const [site] = await tx.select({ id: websites.id, status: websites.status })
        .from(websites)
        .where(and(eq(websites.id, websiteId), eq(websites.organizationId, access.membership.organizationId)))
        .limit(1);
      if (!site) return { missing: true as const };

      const [domain] = await tx.insert(websiteDomains).values({
        organizationId: access.membership.organizationId,
        websiteId: site.id,
        hostname: claim.hostname,
        domainType: claim.type,
        status: "active",
        isPrimary: input.isPrimary === true,
        verifiedAt: new Date(),
      }).returning({
        id: websiteDomains.id,
        hostname: websiteDomains.hostname,
        type: websiteDomains.domainType,
        status: websiteDomains.status,
        isPrimary: websiteDomains.isPrimary,
      });
      await tx.insert(platformAuditEvents).values({
        actorUserId: access.user.id,
        actorKind: "user",
        organizationId: access.membership.organizationId,
        action: "website.domain.claimed",
        targetType: "website_domain",
        targetId: domain.id,
        purpose: "website.domain.manage",
        result: "success",
        metadata: JSON.stringify({ hostname: domain.hostname, domainType: domain.type }),
      });
      return { domain };
    });
    if ("missing" in created) return jsonError("Website not found.", 404);
    return NextResponse.json({ domain: created.domain }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("website_domains_hostname_uq") || message.includes("duplicate key")) {
      return jsonError("That hostname is already claimed.", 409);
    }
    if (message.includes("website_domains_one_primary_per_site_uq")) {
      return jsonError("This website already has a primary domain.", 409);
    }
    return jsonError("Could not claim this hostname.", 400);
  }
}
