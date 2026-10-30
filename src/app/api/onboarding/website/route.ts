import { hasOrganizationPermission } from "@/lib/access/policy";
import {
  websiteMutationAllowed,
  isUniqueWebsiteWrite,
} from "@/lib/websites/draft-revision";
import { randomBytes } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import {
  memberships,
  organizations,
  websitePages,
  websites,
} from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import {
  websiteSetupSchema,
  makeSiteSlug,
} from "@/lib/onboarding/website-setup";
import { serializeInitialWebsiteDraft } from "@/lib/onboarding/initial-website-draft";
import { getTemplateById } from "@/lib/templates/catalogue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  let user: Awaited<ReturnType<typeof getCurrentUser>>;
  try {
    user = await getCurrentUser();
  } catch {
    return jsonError(
      "Workspace storage is temporarily unavailable. Please try again later.",
      503,
    );
  }
  if (!user)
    return jsonError(
      "Sign in with LUCIA ID before saving your website setup.",
      401,
    );

  const expectedAccount = request.headers.get("x-lucia-workspace-account");
  if (expectedAccount && expectedAccount !== user.id)
    return jsonError(
      "Account changed. Reload setup before creating a project.",
      409,
    );
  if (!websiteMutationAllowed(request))
    return jsonError("Request origin denied.", 403);
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError("Please submit a valid setup form.", 400);
  }

  const parsed = websiteSetupSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Please review the setup details.",
        issues: parsed.error.flatten(),
      },
      { status: 422, headers: { "Cache-Control": "no-store" } },
    );
  }

  const setup = parsed.data;
  const template = getTemplateById(setup.templateId);
  if (!template) return jsonError("Choose a valid starting design.", 422);

  const organizationSlug = `${makeSiteSlug(setup.organisationName).slice(0, 35) || "workspace"}-${randomBytes(4).toString("hex")}`;

  try {
    const db = getDb();
    const result = await db.transaction(async (tx) => {
      // Serialize setup attempts for this authenticated user so retries and
      // concurrent double-submits cannot create duplicate workspaces.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${user.id}, 0))`,
      );

      // This identity comes from the verified server session, never request data.
      await tx.execute(
        sql`select set_config('app.current_user_id', ${user.id}, true)`,
      );

      // Reuse an organisation only when the signed-in user already has an active
      // membership in it. This prevents repeated setup submissions from creating
      // another organisation while never exposing another user's workspace.
      const [existingMembership] = await tx
        .select({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          status: organizations.status,
          role: memberships.role,
          membershipStatus: memberships.status,
        })
        .from(memberships)
        .innerJoin(
          organizations,
          eq(memberships.organizationId, organizations.id),
        )
        .where(
          and(
            eq(memberships.userId, user.id),
            eq(memberships.status, "active"),
            sql`lower(trim(${organizations.name})) = lower(trim(${setup.organisationName}))`,
          ),
        )
        .limit(1);

      if (
        existingMembership &&
        (existingMembership.status !== "active" ||
          !hasOrganizationPermission(
            {
              role: existingMembership.role,
              status: existingMembership.membershipStatus,
            },
            "website.edit",
          ))
      )
        throw new Error("SETUP_ACCESS_DENIED");
      let organization:
        { id: string; name: string; slug: string; status: string } | undefined =
        existingMembership;
      let createdOrganization = false;
      if (!organization) {
        const [created] = await tx
          .insert(organizations)
          .values({
            name: setup.organisationName,
            slug: organizationSlug,
            status: "active",
          })
          .returning({
            id: organizations.id,
            name: organizations.name,
            slug: organizations.slug,
            status: organizations.status,
          });
        organization = created;
        createdOrganization = true;

        // Membership insertion is scoped to the organisation created above.
        await tx.execute(
          sql`select set_config('app.current_organization_id', ${organization.id}, true)`,
        );
        await tx.insert(memberships).values({
          organizationId: organization.id,
          userId: user.id,
          role: "owner",
          status: "active",
        });
      }

      // Website tables enforce PostgreSQL RLS. Scope this transaction to the
      // selected organisation before any website/page reads or writes.
      await tx.execute(
        sql`select set_config('app.current_organization_id', ${organization.id}, true)`,
      );

      const [existingWebsite] = await tx
        .select({
          id: websites.id,
          name: websites.name,
          slug: websites.slug,
        })
        .from(websites)
        .where(
          and(
            eq(websites.organizationId, organization.id),
            eq(websites.slug, setup.siteSlug),
          ),
        )
        .limit(1);

      if (existingWebsite) {
        return {
          organization,
          website: existingWebsite,
          created: false,
          createdOrganization: false,
        };
      }

      const [website] = await tx
        .insert(websites)
        .values({
          organizationId: organization.id,
          name: setup.websiteName,
          slug: setup.siteSlug,
          status: "draft",
        })
        .returning({
          id: websites.id,
          name: websites.name,
          slug: websites.slug,
        });

      const serializedInitialDraft = serializeInitialWebsiteDraft(
        setup.templateId,
        setup.websiteName,
      );
      await tx.insert(websitePages).values(
        template.sections.map((section, index) => ({
          organizationId: organization.id,
          websiteId: website.id,
          title: section,
          path: index === 0 ? "/" : `/${makeSiteSlug(section)}`,
          status: "draft",
          // Layout Studio loads the structured draft from the home page. Persist it
          // now so the selected template and website name survive the handoff.
          content: index === 0 ? serializedInitialDraft : "",
        })),
      );

      return { organization, website, created: true, createdOrganization };
    });

    return NextResponse.json(
      {
        organization: {
          id: result.organization.id,
          name: result.organization.name,
        },
        website: result.website,
        status: "draft",
        reused: !result.created,
        message: result.created
          ? "Your workspace and draft website have been saved."
          : "This website already exists in your workspace, so we kept the existing draft.",
      },
      {
        status: result.created ? 201 : 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    // Never expose database details to the browser.
    const message = error instanceof Error ? error.message : "";
    if (message === "SETUP_ACCESS_DENIED")
      return jsonError(
        "You do not have website creation permission in this organization.",
        403,
      );
    if (isUniqueWebsiteWrite(error)) {
      return jsonError(
        "A workspace or website with these details was created at the same time. Refresh your workspace before trying again.",
        409,
      );
    }
    return jsonError(
      "We couldn't save your website yet. Please try again shortly.",
      500,
    );
  }
}
