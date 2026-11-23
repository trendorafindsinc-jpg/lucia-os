import { createHash, timingSafeEqual } from "node:crypto";
import { resolveTxt } from "node:dns/promises";
import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrganizationMembershipsForUser } from "@/lib/access/guards";
import { hasOrganizationPermission } from "@/lib/access/policy";
import { getDb } from "@/lib/db/client";
import { websiteDomains } from "@/lib/db/schema";
import { hasOrganizationEntitlement } from "@/lib/subscriptions/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return error("This verification request did not come from LUCIA OS.", 403);
  const user = await getCurrentUser().catch(() => null);
  if (!user) return error("Sign in with LUCIA ID before verifying a domain.", 401);
  let body: unknown;
  try { body = await request.json(); } catch { return error("Choose a registered domain to verify.", 400); }
  if (!body || typeof body !== "object" || Array.isArray(body) || typeof (body as Record<string, unknown>).domainId !== "string") return error("Choose a registered domain to verify.", 400);
  const domainId = (body as { domainId: string }).domainId;
  const db = getDb();
  const orgs = await getOrganizationMembershipsForUser(user.id);
  for (const org of orgs) {
    if (!hasOrganizationPermission({ role: org.role, status: org.membershipStatus }, "website.publish")) continue;
    const record = await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.current_organization_id', ${org.id}, true)`);
      const [domain] = await tx.select({
        id: websiteDomains.id, hostname: websiteDomains.hostname, status: websiteDomains.status,
        domainType: websiteDomains.domainType, verificationTokenHash: websiteDomains.verificationTokenHash,
      }).from(websiteDomains).where(and(eq(websiteDomains.id, domainId), eq(websiteDomains.organizationId, org.id))).limit(1);
      if (!domain) return null;
      return { ...domain, hasCustomDomainEntitlement: await hasOrganizationEntitlement(tx, org.id, "custom_domains") };
    });
    if (!record) continue;
    if (record.domainType !== "custom") return error("Only custom domains need DNS ownership verification.", 422);
    if (!record.hasCustomDomainEntitlement) return error("An active custom-domain entitlement is required before verification.", 403);
    if (record.status === "verified" || record.status === "active") return NextResponse.json({ verified: true, status: record.status }, { headers: { "Cache-Control": "no-store" } });
    if (!record.verificationTokenHash) return error("This domain has no verification token. Register it again or contact support.", 409);
    let values: string[];
    try {
      const chunks = await resolveTxt("_lucia-verification." + record.hostname);
      values = chunks.map((chunk) => chunk.join(""));
    } catch { return error("The DNS TXT record was not found yet. Check the record name and value, then try again.", 409); }
    const matches = values.some((value) => {
      const digest = createHash("sha256").update(value).digest();
      const expected = Buffer.from(record.verificationTokenHash!, "hex");
      return digest.length === expected.length && timingSafeEqual(digest, expected);
    });
    if (!matches) return error("The TXT record exists, but its value does not match this domain's LUCIA verification token.", 409);
    const transition = await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.current_organization_id', ${org.id}, true)`);
      const [current] = await tx.select({ status: websiteDomains.status, verificationTokenHash: websiteDomains.verificationTokenHash })
        .from(websiteDomains).where(and(eq(websiteDomains.id, record.id), eq(websiteDomains.organizationId, org.id))).limit(1).for("update");
      if (!current) return "missing" as const;
      if (!(await hasOrganizationEntitlement(tx, org.id, "custom_domains"))) return "not_entitled" as const;
      if (current.status === "verified" || current.status === "active") return current.status;
      if (current.status !== "pending" || current.verificationTokenHash !== record.verificationTokenHash) return "changed" as const;
      await tx.update(websiteDomains).set({ status: "verified", verifiedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(websiteDomains.id, record.id), eq(websiteDomains.organizationId, org.id), eq(websiteDomains.status, "pending")));
      return "verified" as const;
    });
    if (transition === "missing") return error("This domain was removed while verification was running.", 409);
    if (transition === "changed") return error("The domain changed during verification. Reload and try again.", 409);
    if (transition === "not_entitled") return error("The custom-domain entitlement expired or was revoked during verification.", 403);
    return NextResponse.json({ verified: true, status: transition, activationRequired: transition === "verified" }, { headers: { "Cache-Control": "no-store" } });
  }
  return error("No registered domain was found for an organisation you can manage.", 404);
}
