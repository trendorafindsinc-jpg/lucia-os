import { and, eq, ne, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrganizationMembershipsForUser } from "@/lib/access/guards";
import { hasOrganizationPermission } from "@/lib/access/policy";
import { getDb } from "@/lib/db/client";
import { memberships, organizations, websitePages, websiteVersions, websites } from "@/lib/db/schema";
import { websiteDefinitionSchema, websiteSummary } from "@/lib/layout-blueprint/website-definition";
import { validateMediaOwnership } from "@/lib/media/service";
import { draftRevision, isDraftRevision, websiteMutationAllowed } from "@/lib/websites/draft-revision";
import { websiteSnapshotSchema } from "@/lib/versions/version-history";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ websiteId: string; versionId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in with LUCIA ID to restore a version." }, { status: 401 });
  if (!websiteMutationAllowed(request)) return NextResponse.json({ error: "Request origin denied." }, { status: 403 });
  const expectedAccount = request.headers.get("x-lucia-workspace-account");
  if (expectedAccount && expectedAccount !== user.id) return NextResponse.json({ error: "Account changed. Reload this workspace before restoring." }, { status: 409 });
  const { websiteId, versionId } = await context.params;
  if (!z.string().uuid().safeParse(websiteId).success || !z.string().uuid().safeParse(versionId).success)
    return NextResponse.json({ error: "Invalid website or version id." }, { status: 400 });
  const expectedRevision = request.headers.get("if-match");
  if (!isDraftRevision(expectedRevision))
    return NextResponse.json({ error: "Reload this website before restoring a checkpoint." }, { status: 428 });

  const db = getDb();
  const orgs = await getOrganizationMembershipsForUser(user.id);
  for (const org of orgs) {
    if (!hasOrganizationPermission({ role: org.role, status: org.membershipStatus }, "website.edit")) continue;
    const outcome = await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.current_user_id', ${user.id}, true), set_config('app.current_organization_id', ${org.id}, true)`);
      const [membership] = await tx.select({ role: memberships.role, status: memberships.status })
        .from(memberships).where(and(eq(memberships.organizationId, org.id), eq(memberships.userId, user.id), eq(memberships.status, "active"))).limit(1);
      if (!membership || !hasOrganizationPermission({ role: membership.role, status: membership.status }, "website.edit")) return { kind: "denied" as const };
      const [organization] = await tx.select({ status: organizations.status }).from(organizations).where(eq(organizations.id, org.id)).limit(1);
      if (!organization || organization.status !== "active") return { kind: "denied" as const };
      const [website] = await tx.select({ id: websites.id, name: websites.name }).from(websites)
        .where(and(eq(websites.id, websiteId), eq(websites.organizationId, org.id), ne(websites.status, "deleted"))).limit(1).for("update");
      if (!website) return { kind: "denied" as const };
      const [version] = await tx.select({ snapshot: websiteVersions.snapshot }).from(websiteVersions)
        .where(and(eq(websiteVersions.id, versionId), eq(websiteVersions.websiteId, websiteId), eq(websiteVersions.organizationId, org.id))).limit(1);
      if (!version) return { kind: "missing" as const };
      let raw: unknown;
      try { raw = JSON.parse(version.snapshot); } catch { return { kind: "invalid" as const }; }
      const parsed = websiteSnapshotSchema.safeParse(raw);
      if (!parsed.success || !parsed.data.composition) return { kind: "legacy" as const };
      const composition = websiteDefinitionSchema.safeParse(parsed.data.composition);
      if (!composition.success) return { kind: "invalid" as const };
      const [home] = await tx.select({ id: websitePages.id, content: websitePages.content }).from(websitePages)
        .where(and(eq(websitePages.websiteId, websiteId), eq(websitePages.organizationId, org.id), eq(websitePages.path, "/"))).limit(1).for("update");
      if (draftRevision(websiteId, home?.content) !== expectedRevision) return { kind: "conflict" as const };
      try { await validateMediaOwnership(tx, org.id, websiteId, composition.data); }
      catch { return { kind: "media" as const }; }
      const summary = websiteSummary(composition.data);
      if (home) {
        await tx.update(websitePages).set({ title: "Home", content: JSON.stringify(composition.data), updatedAt: new Date() })
          .where(and(eq(websitePages.id, home.id), eq(websitePages.organizationId, org.id)));
      } else {
        await tx.insert(websitePages).values({ organizationId: org.id, websiteId, title: "Home", path: "/", status: "draft", content: JSON.stringify(composition.data) });
      }
      await tx.update(websites).set({ name: summary.siteName, updatedAt: new Date() })
        .where(and(eq(websites.id, websiteId), eq(websites.organizationId, org.id)));
      return { kind: "restored" as const, content: JSON.stringify(composition.data) };
    });
    if (outcome.kind === "denied" || outcome.kind === "missing") return NextResponse.json({ error: "Website or version not found, or access denied." }, { status: 404 });
    if (outcome.kind === "conflict") return NextResponse.json({ error: "The website draft changed in another session. Refresh before restoring; nothing was overwritten.", conflict: true }, { status: 409 });
    if (outcome.kind === "legacy") return NextResponse.json({ error: "This older checkpoint contains summary data only, not a complete v2 composition. New checkpoints preserve the complete design." }, { status: 409 });
    if (outcome.kind === "media") return NextResponse.json({ error: "This checkpoint references media that is no longer available to this website. Nothing was restored." }, { status: 422 });
    if (outcome.kind === "invalid") return NextResponse.json({ error: "This checkpoint is invalid or incompatible with the current website engine." }, { status: 422 });
    return NextResponse.json({ restored: true, websiteId, revision: draftRevision(websiteId, outcome.content), published: false }, { headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ error: "Website not found or editing access denied." }, { status: 404 });
}
