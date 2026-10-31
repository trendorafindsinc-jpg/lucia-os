import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrganizationMembershipsForUser } from "@/lib/access/guards";
import { getDb } from "@/lib/db/client";
import {
  memberships,
  organizations,
  websitePages,
  websites,
} from "@/lib/db/schema";
import { hasOrganizationPermission } from "@/lib/access/policy";
import {
  websiteDefinitionSchema,
  websiteMutationSchema,
  mutateWebsite,
  websiteSummary,
  type WebsiteDefinition,
} from "@/lib/layout-blueprint/website-definition";
import { z } from "zod";
import {
  draftRevision,
  isDraftRevision,
  websiteMutationAllowed,
} from "@/lib/websites/draft-revision";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ websiteId: string }> };

async function locateWebsite(
  websiteId: string,
  userId: string,
  permission: string,
) {
  const db = getDb();
  const orgs = await getOrganizationMembershipsForUser(userId);

  for (const org of orgs) {
    if (
      !hasOrganizationPermission(
        { role: org.role, status: org.membershipStatus },
        permission,
      )
    )
      continue;
    const found = await db.transaction(async (tx) => {
      await tx.execute(
        sql`select set_config('app.current_user_id', ${userId}, true)`,
      );
      const [membership] = await tx
        .select({ role: memberships.role, status: memberships.status })
        .from(memberships)
        .where(
          and(
            eq(memberships.organizationId, org.id),
            eq(memberships.userId, userId),
            eq(memberships.status, "active"),
          ),
        )
        .limit(1);
      if (
        !membership ||
        !hasOrganizationPermission(
          { role: membership.role, status: membership.status },
          permission,
        )
      )
        return null;
      await tx.execute(
        sql`select set_config('app.current_organization_id', ${org.id}, true)`,
      );
      const [organization] = await tx
        .select({ status: organizations.status })
        .from(organizations)
        .where(eq(organizations.id, org.id))
        .limit(1);
      if (!organization || organization.status !== "active") return null;
      const [website] = await tx
        .select({
          id: websites.id,
          organizationId: websites.organizationId,
          name: websites.name,
          slug: websites.slug,
          status: websites.status,
        })
        .from(websites)
        .where(
          and(eq(websites.id, websiteId), eq(websites.organizationId, org.id)),
        )
        .limit(1);
      if (!website) return null;
      const pages = await tx
        .select({
          id: websitePages.id,
          title: websitePages.title,
          path: websitePages.path,
          content: websitePages.content,
        })
        .from(websitePages)
        .where(
          and(
            eq(websitePages.websiteId, website.id),
            eq(websitePages.organizationId, org.id),
          ),
        );
      return { website, pages };
    });
    if (found) return found;
  }
  return null;
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { error: "Sign in with LUCIA ID to edit a saved website." },
      { status: 401 },
    );
  const { websiteId } = await context.params;
  if (!z.string().uuid().safeParse(websiteId).success)
    return NextResponse.json({ error: "Invalid website id." }, { status: 400 });
  const found = await locateWebsite(websiteId, user.id, "website.read");
  if (!found)
    return NextResponse.json(
      { error: "Website not found or access denied." },
      { status: 404 },
    );

  const home = found.pages.find((page) => page.path === "/");
  let draft: WebsiteDefinition | null = null;
  if (home?.content) {
    try {
      const parsed = JSON.parse(home.content) as unknown;
      const valid = websiteDefinitionSchema.safeParse(parsed);
      if (valid.success) draft = valid.data;
    } catch {
      // Older plain-text page content is not treated as a structured editor draft.
    }
  }
  return NextResponse.json(
    {
      website: {
        id: found.website.id,
        name: found.website.name,
        slug: found.website.slug,
        status: found.website.status,
      },
      draft,
      pageCount: found.pages.length,
      revision: draftRevision(found.website.id, home?.content),
    },
    {
      headers: {
        "Cache-Control": "no-store",
        ETag: draftRevision(found.website.id, home?.content),
      },
    },
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { error: "Sign in with LUCIA ID to save changes." },
      { status: 401 },
    );
  const expectedAccount = request.headers.get("x-lucia-workspace-account");
  if (expectedAccount && expectedAccount !== user.id)
    return NextResponse.json(
      { error: "Account changed. Reload this workspace before saving." },
      { status: 409 },
    );
  const { websiteId } = await context.params;
  if (!z.string().uuid().safeParse(websiteId).success)
    return NextResponse.json({ error: "Invalid website id." }, { status: 400 });
  if (!websiteMutationAllowed(request))
    return NextResponse.json(
      { error: "Request origin denied." },
      { status: 403 },
    );
  let raw: unknown;
  try {
    const body = await request.text();
    if (body.length > 300_000)
      return NextResponse.json(
        { error: "Draft request is too large." },
        { status: 413 },
      );
    raw = JSON.parse(body);
  } catch {
    return NextResponse.json(
      { error: "Submit valid draft data." },
      { status: 400 },
    );
  }
  const parsed = websiteMutationSchema.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json(
      {
        error: "Please check the draft fields.",
        issues: parsed.error.flatten(),
      },
      { status: 422 },
    );

  const found = await locateWebsite(websiteId, user.id, "website.edit");
  if (!found)
    return NextResponse.json(
      { error: "Website not found or you do not have editing access." },
      { status: 404 },
    );
  const expectedRevision = request.headers.get("if-match");
  if (!isDraftRevision(expectedRevision))
    return NextResponse.json(
      {
        error:
          "Reload this website to obtain its draft revision before saving.",
      },
      { status: 428 },
    );
  const db = getDb();
  let persisted: WebsiteDefinition | null = null;
  const saved = await db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('app.current_user_id', ${user.id}, true)`,
    );
    const [membership] = await tx
      .select({ role: memberships.role, status: memberships.status })
      .from(memberships)
      .where(
        and(
          eq(memberships.organizationId, found.website.organizationId),
          eq(memberships.userId, user.id),
          eq(memberships.status, "active"),
        ),
      )
      .limit(1);
    if (
      !membership ||
      !hasOrganizationPermission(
        { role: membership.role, status: membership.status },
        "website.edit",
      )
    )
      return false;
    await tx.execute(
      sql`select set_config('app.current_organization_id', ${found.website.organizationId}, true)`,
    );
    const [organization] = await tx
      .select({ status: organizations.status })
      .from(organizations)
      .where(eq(organizations.id, found.website.organizationId))
      .limit(1);
    if (!organization || organization.status !== "active") return false;
    const [website] = await tx
      .select({ id: websites.id })
      .from(websites)
      .where(
        and(
          eq(websites.id, found.website.id),
          eq(websites.organizationId, found.website.organizationId),
        ),
      )
      .limit(1);
    if (!website) return false;
    // Lock and read the current home row in the same transaction as the write.
    // Both editor saves and publishing acquire this lock before comparing revisions.
    const [home] = await tx
      .select({ id: websitePages.id, content: websitePages.content })
      .from(websitePages)
      .where(
        and(
          eq(websitePages.websiteId, found.website.id),
          eq(websitePages.organizationId, found.website.organizationId),
          eq(websitePages.path, "/"),
        ),
      )
      .limit(1)
      .for("update");
    if (draftRevision(found.website.id, home?.content) !== expectedRevision)
      return "conflict" as const;
    let definition: WebsiteDefinition;
    try {
      definition = mutateWebsite(
        JSON.parse(home?.content ?? "null"),
        parsed.data,
      );
    } catch {
      return "invalid-edit" as const;
    }
    persisted = definition;
    await tx
      .update(websites)
      .set({ name: websiteSummary(definition).siteName, updatedAt: new Date() })
      .where(
        and(
          eq(websites.id, found.website.id),
          eq(websites.organizationId, found.website.organizationId),
        ),
      );
    if (home) {
      await tx
        .update(websitePages)
        .set({
          title: "Home",
          content: JSON.stringify(definition),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(websitePages.id, home.id),
            eq(websitePages.organizationId, found.website.organizationId),
          ),
        );
    } else {
      await tx.insert(websitePages).values({
        organizationId: found.website.organizationId,
        websiteId: found.website.id,
        title: "Home",
        path: "/",
        status: "draft",
        content: JSON.stringify(definition),
      });
    }
    return true;
  });
  if (saved === "invalid-edit")
    return NextResponse.json(
      {
        error:
          "This edit is not permitted by the saved Layout. Reload and check Design Lock and editing permissions.",
      },
      { status: 422 },
    );
  if (saved === "conflict")
    return NextResponse.json(
      {
        error:
          "This draft changed in another session. Review the latest saved version before retrying.",
        conflict: true,
      },
      { status: 409 },
    );
  if (!saved)
    return NextResponse.json(
      { error: "Website not found or editing access was revoked." },
      { status: 404 },
    );
  return NextResponse.json(
    {
      saved: true,
      websiteId: found.website.id,
      savedAt: new Date().toISOString(),
      revision: draftRevision(found.website.id, JSON.stringify(persisted)),
      draft: persisted,
      status: "draft",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
