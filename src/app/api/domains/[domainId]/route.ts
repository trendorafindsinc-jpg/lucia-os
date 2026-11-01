import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrganizationMembershipsForUser } from "@/lib/access/guards";
import { hasOrganizationPermission } from "@/lib/access/policy";
import { getDb } from "@/lib/db/client";
import { websiteDomains } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

async function getAuthorizedDomain(domainId: string) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return { response: error("Sign in with LUCIA ID before managing domains.", 401) };
  const db = getDb();
  const orgs = await getOrganizationMembershipsForUser(user.id);
  for (const org of orgs) {
    if (!hasOrganizationPermission({ role: org.role, status: org.membershipStatus }, "website.publish")) continue;
    const domain = await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.current_organization_id', ${org.id}, true)`);
      const [found] = await tx.select({
        id: websiteDomains.id, organizationId: websiteDomains.organizationId, websiteId: websiteDomains.websiteId,
        domainType: websiteDomains.domainType, status: websiteDomains.status, isPrimary: websiteDomains.isPrimary,
      }).from(websiteDomains).where(and(eq(websiteDomains.id, domainId), eq(websiteDomains.organizationId, org.id))).limit(1);
      return found ?? null;
    });
    if (domain) return { db, organizationId: org.id, domain };
  }
  return { response: error("No registered domain was found for an organisation you can manage.", 404) };
}

export async function PATCH(request: Request, context: { params: Promise<{ domainId: string }> }) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return error("This domain request did not come from LUCIA OS.", 403);
  const { domainId } = await context.params;
  const authorized = await getAuthorizedDomain(domainId);
  if ("response" in authorized) return authorized.response;
  const { db, organizationId, domain } = authorized;
  if (domain.status !== "active") return error("Only an active domain can be set as primary. Complete its verification and activation first.", 409);

  await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_organization_id', ${organizationId}, true)`);
    await tx.update(websiteDomains).set({ isPrimary: false, updatedAt: new Date() })
      .where(and(eq(websiteDomains.organizationId, organizationId), eq(websiteDomains.websiteId, domain.websiteId)));
    await tx.update(websiteDomains).set({ isPrimary: true, updatedAt: new Date() })
      .where(and(eq(websiteDomains.id, domain.id), eq(websiteDomains.organizationId, organizationId), eq(websiteDomains.status, "active")));
  });
  return NextResponse.json({ updated: true, domainId, isPrimary: true }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request, context: { params: Promise<{ domainId: string }> }) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return error("This domain request did not come from LUCIA OS.", 403);
  const { domainId } = await context.params;
  const authorized = await getAuthorizedDomain(domainId);
  if ("response" in authorized) return authorized.response;
  const { db, organizationId, domain } = authorized;
  if (domain.domainType !== "custom") return error("The automatically managed LUCIA subdomain cannot be disconnected here.", 422);

  await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_organization_id', ${organizationId}, true)`);
    await tx.delete(websiteDomains).where(and(
      eq(websiteDomains.id, domain.id),
      eq(websiteDomains.organizationId, organizationId),
      eq(websiteDomains.domainType, "custom"),
    ));
  });
  return NextResponse.json({ removed: true, domainId }, { headers: { "Cache-Control": "no-store" } });
}
