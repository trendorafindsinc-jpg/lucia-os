import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { memberships, organizations, websitePages, websites } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { websiteSetupSchema, makeSiteSlug } from "@/lib/onboarding/website-setup";
import { getTemplateById } from "@/lib/templates/catalogue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Sign in with LUCIA ID before saving your website setup.", 401);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError("Please submit a valid setup form.", 400);
  }

  const parsed = websiteSetupSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please review the setup details.", issues: parsed.error.flatten() },
      { status: 422, headers: { "Cache-Control": "no-store" } },
    );
  }

  const setup = parsed.data;
  const template = getTemplateById(setup.templateId);
  if (!template) return jsonError("Choose a valid starting design.", 422);

  const db = getDb();
  const organizationSlug = `${makeSiteSlug(setup.organisationName).slice(0, 35) || "workspace"}-${randomBytes(4).toString("hex")}`;

  try {
    const result = await db.transaction(async (tx) => {
      const [organization] = await tx.insert(organizations).values({
        name: setup.organisationName,
        slug: organizationSlug,
        status: "active",
      }).returning({ id: organizations.id, name: organizations.name });

      // Website tables enforce PostgreSQL RLS. Scope this transaction to the newly
      // created organisation before any website/page writes.
      await tx.execute(sql`select set_config('app.current_organization_id', ${organization.id}, true)`);

      await tx.insert(memberships).values({
        organizationId: organization.id,
        userId: user.id,
        role: "owner",
        status: "active",
      });

      const [website] = await tx.insert(websites).values({
        organizationId: organization.id,
        name: setup.websiteName,
        slug: setup.siteSlug,
        status: "draft",
      }).returning({ id: websites.id, name: websites.name, slug: websites.slug });

      await tx.insert(websitePages).values(template.sections.map((section, index) => ({
        organizationId: organization.id,
        websiteId: website.id,
        title: section,
        path: index === 0 ? "/" : `/${makeSiteSlug(section)}`,
        status: "draft",
        content: "",
      })));

      return { organization, website };
    });

    return NextResponse.json(
      {
        organization: result.organization,
        website: result.website,
        status: "draft",
        message: "Your workspace and draft website have been saved.",
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    // Unique website-page paths or a database uniqueness conflict should be actionable,
    // while internal database details must never be returned to the browser.
    const message = error instanceof Error ? error.message : "";
    if (/unique constraint|duplicate key/i.test(message)) {
      return jsonError("That website address is already in use in this workspace. Change the address and try again.", 409);
    }
    return jsonError("We couldn't save your website yet. Please try again shortly.", 500);
  }
}
