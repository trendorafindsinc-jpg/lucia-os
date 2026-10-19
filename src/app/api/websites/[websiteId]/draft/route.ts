import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { memberships, organizations, websitePages, websites } from "@/lib/db/schema";
import { hasOrganizationPermission } from "@/lib/access/policy";
import { siteDraftSchema, makeInitialDraft, type SiteDraft } from "@/lib/editor/site-draft";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ websiteId: string }> };

async function locateWebsite(websiteId: string, userId: string, permission: string) {
  const db = getDb();
  const orgs = await db.select({
    id: organizations.id,
    role: memberships.role,
    membershipStatus: memberships.status,
  }).from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(and(eq(memberships.userId, userId), eq(memberships.status, "active"), eq(organizations.status, "active")));

  for (const org of orgs) {
    if (!hasOrganizationPermission({ role: org.role, status: org.membershipStatus }, permission)) continue;
    const found = await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.current_organization_id', ${org.id}, true)`);
      const [website] = await tx.select({
        id: websites.id,
        organizationId: websites.organizationId,
        name: websites.name,
        slug: websites.slug,
        status: websites.status,
      }).from(websites).where(and(eq(websites.id, websiteId), eq(websites.organizationId, org.id))).limit(1);
      if (!website) return null;
      const pages = await tx.select({
        id: websitePages.id,
        title: websitePages.title,
        path: websitePages.path,
        content: websitePages.content,
      }).from(websitePages).where(and(eq(websitePages.websiteId, website.id), eq(websitePages.organizationId, org.id)));
      return { website, pages };
    });
    if (found) return found;
  }
  return null;
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in with LUCIA ID to edit a saved website." }, { status: 401 });
  const { websiteId } = await context.params;
  const found = await locateWebsite(websiteId, user.id, "website.read");
  if (!found) return NextResponse.json({ error: "Website not found or access denied." }, { status: 404 });

  const home = found.pages.find((page) => page.path === "/") ?? found.pages[0];
  let draft: SiteDraft | null = null;
  if (home?.content) {
    try {
      const parsed = JSON.parse(home.content) as unknown;
      const valid = siteDraftSchema.safeParse(parsed);
      if (valid.success) draft = valid.data;
    } catch {
      // Older plain-text page content is not treated as a structured editor draft.
    }
  }
  return NextResponse.json({
    website: { id: found.website.id, name: found.website.name, slug: found.website.slug, status: found.website.status },
    draft,
    pageCount: found.pages.length,
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in with LUCIA ID to save changes." }, { status: 401 });
  const { websiteId } = await context.params;
  let raw: unknown;
  try { raw = await request.json(); } catch {
    return NextResponse.json({ error: "Submit valid draft data." }, { status: 400 });
  }
  const parsed = siteDraftSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Please check the draft fields.", issues: parsed.error.flatten() }, { status: 422 });

  const found = await locateWebsite(websiteId, user.id, "website.edit");
  if (!found) return NextResponse.json({ error: "Website not found or you do not have editing access." }, { status: 404 });
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_organization_id', ${found.website.organizationId}, true)`);
    await tx.update(websites).set({ name: parsed.data.siteName, updatedAt: new Date() })
      .where(and(eq(websites.id, found.website.id), eq(websites.organizationId, found.website.organizationId)));
    const home = found.pages.find((page) => page.path === "/") ?? found.pages[0];
    if (home) {
      await tx.update(websitePages).set({
        title: "Home",
        content: JSON.stringify(parsed.data),
        updatedAt: new Date(),
      }).where(and(eq(websitePages.id, home.id), eq(websitePages.organizationId, found.website.organizationId)));
    } else {
      await tx.insert(websitePages).values({
        organizationId: found.website.organizationId,
        websiteId: found.website.id,
        title: "Home",
        path: "/",
        status: "draft",
        content: JSON.stringify(parsed.data),
      });
    }
  });
  return NextResponse.json({ saved: true, websiteId: found.website.id, savedAt: new Date().toISOString(), status: "draft" }, { headers: { "Cache-Control": "no-store" } });
}
