import { and, eq, ne, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrganizationMembershipsForUser } from "@/lib/access/guards";
import { hasOrganizationPermission } from "@/lib/access/policy";
import { getDb } from "@/lib/db/client";
import { memberships, organizations, platformAuditEvents, websiteDomains, websites } from "@/lib/db/schema";
import { websiteMutationAllowed } from "@/lib/websites/draft-revision";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const confirmationSchema = z.object({ confirmation: z.string().min(1).max(300) }).strict();
const json = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "no-store" },
});
type Context = { params: Promise<{ websiteId: string }> };

export async function DELETE(request: Request, context: Context) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return json({ error: "Sign in with LUCIA ID to remove websites." }, 401);
  if (!websiteMutationAllowed(request)) return json({ error: "Request origin denied." }, 403);
  const account = request.headers.get("x-lucia-workspace-account");
  if (account && account !== user.id) return json({ error: "Account changed. Reload Settings." }, 409);
  const { websiteId } = await context.params;
  if (!z.uuid().safeParse(websiteId).success) return json({ error: "Invalid website." }, 400);
  let raw: unknown;
  try {
    if (Number(request.headers.get("content-length") || 0) > 1024) return json({ error: "Confirmation is too long." }, 413);
    const body = await request.text();
    if (body.length > 1024) return json({ error: "Confirmation is too long." }, 413);
    raw = JSON.parse(body);
  } catch {
    return json({ error: "Enter the exact website name to confirm." }, 400);
  }
  const parsed = confirmationSchema.safeParse(raw);
  if (!parsed.success) return json({ error: "Enter the exact website name to confirm." }, 422);
  try {
    const permitted = (await getOrganizationMembershipsForUser(user.id))
      .filter((org) => hasOrganizationPermission(
        { role: org.role, status: org.membershipStatus }, "organization.delete",
      ));
    const db = getDb();
    for (const org of permitted) {
      const result = await db.transaction(async (tx) => {
        await tx.execute(sql`select set_config('app.current_user_id', ${user.id}, true),set_config('app.current_organization_id', ${org.id}, true)`);
        // Re-check active owner permissions inside the write transaction.
        const [membership] = await tx.select({ role: memberships.role, status: memberships.status })
          .from(memberships).where(and(eq(memberships.organizationId, org.id), eq(memberships.userId, user.id), eq(memberships.status, "active"))).limit(1);
        if (!hasOrganizationPermission(membership, "organization.delete")) return null;
        const [organization] = await tx.select({ status: organizations.status }).from(organizations)
          .where(and(eq(organizations.id, org.id), eq(organizations.status, "active"))).limit(1);
        if (!organization) return null;
        // Serialize with editor/publishing writes before removing the hostname.
        const [site] = await tx.select({ id: websites.id, name: websites.name, slug: websites.slug, status: websites.status })
          .from(websites)
          .where(and(eq(websites.id, websiteId), eq(websites.organizationId, org.id), ne(websites.status, "deleted")))
          .limit(1).for("update");
        if (!site) return null;
        if (parsed.data.confirmation !== site.name) return { mismatch: true as const };
        // Atomic offline transition. Retain drafts, versions and media for safe recovery.
        await tx.delete(websiteDomains).where(and(eq(websiteDomains.websiteId, site.id), eq(websiteDomains.organizationId, org.id)));
        await tx.update(websites).set({
          status: "deleted",
          slug: "deleted-" + site.id,
          publishedAt: null,
          updatedAt: new Date(),
        }).where(and(eq(websites.id, site.id), eq(websites.organizationId, org.id)));
        await tx.insert(platformAuditEvents).values({
          actorUserId: user.id, actorKind: "tenant", organizationId: org.id,
          action: "website.removed", targetType: "website", targetId: site.id,
          purpose: "website.lifecycle", result: "success",
          metadata: JSON.stringify({
            previousSlug: site.slug, previousStatus: site.status,
            retention: "pending_safe_cleanup",
          }),
        });
        return { removed: true as const };
      });
      if (!result) continue;
      if ("mismatch" in result) return json({ error: "Website name did not match. Nothing was changed." }, 409);
      return json({ removed: true, websiteId, dataErased: false });
    }
    return json({ error: "Website not found or only its organisation owner may remove it." }, 404);
  } catch {
    return json({ error: "Website removal could not be completed. Try again without changing your other websites." }, 503);
  }
}
