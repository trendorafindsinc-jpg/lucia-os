import { createHash, randomBytes } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasOrganizationPermission } from "@/lib/access/policy";
import { getDb } from "@/lib/db/client";
import { customDomainSchema } from "@/lib/publishing/publishing";
import { memberships, organizations, websiteDomains, websites } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return error("This domain request did not come from LUCIA OS.", 403);
  const user = await getCurrentUser().catch(() => null);
  if (!user) return error("Sign in with LUCIA ID before registering a domain.", 401);

  let body: unknown;
  try { body = await request.json(); } catch { return error("Submit a valid website and domain hostname.", 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return error("Submit a valid website and domain hostname.", 400);
  const input = body as Record<string, unknown>;
  if (typeof input.websiteId !== "string" || typeof input.hostname !== "string") return error("Choose a website and enter a hostname.", 400);
  const parsed = customDomainSchema.safeParse(input.hostname);
  if (!parsed.success) return error(parsed.error.issues[0]?.message || "Enter a valid custom domain hostname.", 422);
  const hostname = parsed.data;
  const siteDomain = (process.env.LUCIA_SITE_DOMAIN || "lucia.name.ng").trim().toLowerCase().replace(/^\*\./, "").replace(/\.$/, "");
  if (hostname === siteDomain || hostname.endsWith("." + siteDomain)) return error("Use the LUCIA subdomain option for lucia.name.ng addresses. This form is for domains you control.", 422);

  const db = getDb();
  const orgs = await db.select({ id: organizations.id, role: memberships.role, membershipStatus: memberships.status })
    .from(memberships).innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(and(eq(memberships.userId, user.id), eq(memberships.status, "active"), eq(organizations.status, "active")));
  for (const org of orgs) {
    if (!hasOrganizationPermission({ role: org.role, status: org.membershipStatus }, "website.publish")) continue;
    try {
      const result = await db.transaction(async (tx) => {
        await tx.execute(sql`select set_config('app.current_organization_id', ${org.id}, true)`);
        const [website] = await tx.select({ id: websites.id, name: websites.name, slug: websites.slug, status: websites.status })
          .from(websites).where(and(eq(websites.id, input.websiteId as string), eq(websites.organizationId, org.id))).limit(1);
        if (!website) return null;
        const [existing] = await tx.select({ id: websiteDomains.id }).from(websiteDomains).where(eq(websiteDomains.hostname, hostname)).limit(1);
        if (existing) throw new Error("DOMAIN_ALREADY_REGISTERED");
        const token = randomBytes(32).toString("hex");
        const [domain] = await tx.insert(websiteDomains).values({
          organizationId: org.id, websiteId: website.id, hostname, domainType: "custom", status: "pending",
          isPrimary: false, verificationTokenHash: createHash("sha256").update(token).digest("hex"), updatedAt: new Date(),
        }).returning({ id: websiteDomains.id, hostname: websiteDomains.hostname, domainType: websiteDomains.domainType, status: websiteDomains.status, isPrimary: websiteDomains.isPrimary, createdAt: websiteDomains.createdAt });
        return { domain: { ...domain, websiteId: website.id, organizationId: org.id, organizationName: "", websiteName: website.name, websiteStatus: website.status }, verification: { domainId: domain.id, hostname, recordName: "_lucia-verification." + hostname, recordValue: token } };
      });
      if (!result) continue;
      return NextResponse.json(result, { status: 201, headers: { "Cache-Control": "no-store" } });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "";
      if (message === "DOMAIN_ALREADY_REGISTERED" || /website_domains_hostname_uq|duplicate key|unique constraint/i.test(message)) return error("That hostname is already registered. Every domain can belong to only one website.", 409);
      return error("We couldn't register this domain. No existing website or domain was changed.", 503);
    }
  }
  return error("No website with domain-management permission was found for your LUCIA ID.", 403);
}
