import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrganizationMembershipsForUser } from "@/lib/access/guards";
import { hasOrganizationPermission } from "@/lib/access/policy";
import { getDb } from "@/lib/db/client";
import {
  memberships,
  organizations,
  websiteDomains,
  websitePages,
  websites,
} from "@/lib/db/schema";
import { siteDraftSchema } from "@/lib/editor/site-draft";
import { premiumLayoutSchema } from "@/lib/layout-blueprint/premium-composition";
import { checkPremiumPublishContacts } from "@/lib/layout-blueprint/premium-publish-readiness";
import {
  isPremium,
  websiteDefinitionSchema,
  websiteSummary,
} from "@/lib/layout-blueprint/website-definition";
import {
  publishActionSchema,
  publishRequestSchema,
} from "@/lib/publishing/publishing";

import {
  draftRevision,
  isDraftRevision,
  websiteMutationAllowed,
  isUniqueWebsiteWrite,
} from "@/lib/websites/draft-revision";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(request: Request) {
  if (!websiteMutationAllowed(request))
    return jsonError(
      "This publishing request did not come from LUCIA OS.",
      403,
    );
  const user = await getCurrentUser().catch(() => null);
  if (!user)
    return jsonError(
      "Sign in with LUCIA ID before saving or publishing your website.",
      401,
    );
  const expectedAccount = request.headers.get("x-lucia-workspace-account");
  if (expectedAccount && expectedAccount !== user.id)
    return jsonError(
      "Account changed. Reload publishing before continuing.",
      409,
    );
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Submit valid website details.", 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    return jsonError("Submit valid website details.", 400);
  const actionResult = publishActionSchema.safeParse(
    (body as Record<string, unknown>).action,
  );
  if (!actionResult.success)
    return jsonError("Choose an explicit save or publish action.", 400);
  const action = actionResult.data;
  const parsed = publishRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Review your website details before saving.",
        issues: parsed.error.flatten(),
      },
      { status: 422, headers: { "Cache-Control": "no-store" } },
    );
  }
  const settings = parsed.data;
  const expectedRevision = request.headers.get("if-match");
  if (!isDraftRevision(expectedRevision))
    return jsonError(
      "Reload the saved website before saving or publishing.",
      428,
    );
  let db: ReturnType<typeof getDb>;
  try {
    db = getDb();
  } catch {
    return jsonError(
      "Website storage is not configured. Your changes have not been published.",
      503,
    );
  }

  let orgRows: Array<{ id: string; role: string; membershipStatus: string }>;
  try {
    orgRows = await getOrganizationMembershipsForUser(user.id);
  } catch {
    return jsonError(
      "We couldn't verify your organisation access. Please try again.",
      503,
    );
  }

  const requiredPermission =
    action === "save" ? "website.edit" : "website.publish";
  const permitted = orgRows.filter((org) =>
    hasOrganizationPermission(
      { role: org.role, status: org.membershipStatus },
      requiredPermission,
    ),
  );
  if (permitted.length === 0)
    return jsonError(
      "You need an active organisation membership with website publishing permission.",
      403,
    );

  for (const org of permitted) {
    try {
      const result = await db.transaction(async (tx) => {
        await tx.execute(
          sql`select set_config('app.current_user_id', ${user.id}, true)`,
        );
        const [membership] = await tx
          .select({ role: memberships.role, status: memberships.status })
          .from(memberships)
          .where(
            and(
              eq(memberships.organizationId, org.id),
              eq(memberships.userId, user.id),
              eq(memberships.status, "active"),
            ),
          )
          .limit(1);
        if (
          !membership ||
          !hasOrganizationPermission(membership, requiredPermission)
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
            slug: websites.slug,
            status: websites.status,
          })
          .from(websites)
          .where(
            and(
              eq(websites.organizationId, org.id),
              eq(websites.id, settings.websiteId),
            ),
          )
          .limit(1);
        if (!website) return null;
        if (website.slug !== settings.siteSlug)
          throw new Error("WEBSITE_ADDRESS_MISMATCH");
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
              eq(websitePages.organizationId, org.id),
              eq(websitePages.websiteId, website.id),
            ),
          )
          .orderBy(websitePages.id)
          .for("update");
        const home = pages.find((page) => page.path === "/");
        if (draftRevision(website.id, home?.content) !== expectedRevision)
          throw new Error("DRAFT_CONFLICT");
        let currentDraft: unknown;
        try {
          currentDraft = JSON.parse(home?.content ?? "");
        } catch {
          throw new Error("INVALID_SAVED_DRAFT");
        }
        const current = websiteDefinitionSchema.safeParse(currentDraft);
        if (!current.success) throw new Error("INVALID_SAVED_DRAFT");
        const draftResult = isPremium(current.data)
          ? premiumLayoutSchema.safeParse(current.data)
          : siteDraftSchema.safeParse({
              ...current.data,
              siteName: settings.siteName,
              headline: settings.headline,
              description: settings.description,
            });
        if (!draftResult.success)
          throw new Error(
            "The saved website draft is incomplete. Open the visual editor and save a valid draft first.",
          );
        const definition = draftResult.data;
        const actualName = websiteSummary(definition).siteName;
        const snapshot = JSON.stringify(definition);
        const now = new Date();

        if (action === "save") {
          if (home) {
            await tx
              .update(websitePages)
              .set({ title: "Home", content: snapshot, updatedAt: now })
              .where(
                and(
                  eq(websitePages.id, home.id),
                  eq(websitePages.organizationId, org.id),
                  eq(websitePages.websiteId, website.id),
                ),
              );
          } else {
            await tx.insert(websitePages).values({
              organizationId: org.id,
              websiteId: website.id,
              title: "Home",
              path: "/",
              status: "draft",
              content: snapshot,
              updatedAt: now,
            });
          }
          await tx
            .update(websites)
            .set({ name: actualName, updatedAt: now })
            .where(
              and(
                eq(websites.id, website.id),
                eq(websites.organizationId, org.id),
              ),
            );
          return {
            action,
            id: website.id,
            slug: website.slug,
            name: actualName,
            status: website.status,
            savedAt: now.toISOString(),
            revision: draftRevision(website.id, snapshot),
          };
        }

        if (isPremium(definition)) {
          const review = checkPremiumPublishContacts(definition);
          if (!review.ready) throw new Error("PREMIUM_CONTACT_NOT_READY");
        }

        // The public renderer expects a validated site-draft snapshot for every
        // published path. Previously only "/" received one, leaving seeded
        // About/Services/Contact routes permanently 404 after publishing.
        if (isPremium(definition)) {
          // All public page snapshots change atomically with hostname activation.
          // Retired routes cease to be public only after a successful commit.
          for (const old of pages) {
            if (!definition.pages.some((p) => p.path === old.path)) {
              await tx
                .update(websitePages)
                .set({ status: "draft", updatedAt: now })
                .where(
                  and(
                    eq(websitePages.id, old.id),
                    eq(websitePages.organizationId, org.id),
                    eq(websitePages.websiteId, website.id),
                  ),
                );
            }
          }
          for (const registered of definition.pages) {
            const existing = pages.find((p) => p.path === registered.path);
            const values = {
              title: registered.title,
              publishedContent: snapshot,
              status: "published",
              updatedAt: now,
              ...(registered.path === "/" ? { content: snapshot } : {}),
            };
            if (existing)
              await tx
                .update(websitePages)
                .set(values)
                .where(
                  and(
                    eq(websitePages.id, existing.id),
                    eq(websitePages.organizationId, org.id),
                    eq(websitePages.websiteId, website.id),
                  ),
                );
            else
              await tx
                .insert(websitePages)
                .values({
                  ...values,
                  content: snapshot,
                  path: registered.path,
                  websiteId: website.id,
                  organizationId: org.id,
                });
          }
        } else if (pages.length === 0) {
          await tx.insert(websitePages).values({
            organizationId: org.id,
            websiteId: website.id,
            title: "Home",
            path: "/",
            status: "published",
            content: snapshot,
            publishedContent: snapshot,
            updatedAt: now,
          });
        } else {
          for (const page of pages) {
            const isHome = page.path === "/";
            await tx
              .update(websitePages)
              .set({
                ...(isHome ? { title: "Home", content: snapshot } : {}),
                publishedContent: snapshot,
                status: "published",
                updatedAt: now,
              })
              .where(
                and(
                  eq(websitePages.id, page.id),
                  eq(websitePages.organizationId, org.id),
                  eq(websitePages.websiteId, website.id),
                ),
              );
          }
        }
        await tx
          .update(websites)
          .set({
            name: actualName,
            status: "published",
            publishedAt: now,
            updatedAt: now,
          })
          .where(
            and(
              eq(websites.id, website.id),
              eq(websites.organizationId, org.id),
            ),
          );

        // Publishing owns the free LUCIA subdomain lifecycle: activate its exact
        // hostname in the same transaction as the published snapshot. Wildcard
        // DNS is only transport; routing still requires this exact active record.
        const siteDomain = (process.env.LUCIA_SITE_DOMAIN || "lucia.name.ng")
          .trim()
          .toLowerCase()
          .replace(/^\*\./, "")
          .replace(/^\./, "")
          .replace(/\.$/, "");
        const hostname = website.slug + "." + siteDomain;
        const [existingDomain] = await tx
          .select({
            id: websiteDomains.id,
            organizationId: websiteDomains.organizationId,
            websiteId: websiteDomains.websiteId,
            domainType: websiteDomains.domainType,
          })
          .from(websiteDomains)
          .where(eq(websiteDomains.hostname, hostname))
          .limit(1);
        if (
          existingDomain &&
          (existingDomain.organizationId !== org.id ||
            existingDomain.websiteId !== website.id ||
            existingDomain.domainType !== "lucia_subdomain")
        ) {
          throw new Error(
            "The requested LUCIA hostname is already owned by another website.",
          );
        }
        if (existingDomain) {
          await tx
            .update(websiteDomains)
            .set({
              status: "active",
              verifiedAt: now,
              updatedAt: now,
            })
            .where(
              and(
                eq(websiteDomains.id, existingDomain.id),
                eq(websiteDomains.organizationId, org.id),
                eq(websiteDomains.websiteId, website.id),
              ),
            );
        } else {
          await tx.insert(websiteDomains).values({
            organizationId: org.id,
            websiteId: website.id,
            hostname,
            domainType: "lucia_subdomain",
            status: "active",
            verifiedAt: now,
            isPrimary: false,
            updatedAt: now,
          });
        }
        return {
          action,
          id: website.id,
          slug: website.slug,
          name: actualName,
          status: "published",
          revision: draftRevision(website.id, snapshot),
          publishedAt: now.toISOString(),
          publishedPageCount: Math.max(pages.length, 1),
        };
      });

      if (!result) continue;
      if (action === "save")
        return NextResponse.json(
          { saved: true, website: result },
          { headers: { "Cache-Control": "no-store" } },
        );
      const domain = (process.env.LUCIA_SITE_DOMAIN || "lucia.name.ng")
        .trim()
        .replace(/^\*\./, "");
      return NextResponse.json(
        {
          published: true,
          website: result,
          url: "https://" + result.slug + "." + domain,
          customDomain: settings.customDomain
            ? {
                status: "pending_activation",
                message:
                  "No custom-domain payment was taken. Its separate one-time activation and DNS/TLS verification are not connected yet.",
              }
            : { status: "not_requested" },
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "DRAFT_CONFLICT")
        return jsonError(
          "The saved website changed. Reload it and review your edits before publishing.",
          409,
        );
      if (message === "WEBSITE_ADDRESS_MISMATCH")
        return jsonError(
          "The address does not match the selected website. Reload the selected project.",
          409,
        );
      if (message === "PREMIUM_CONTACT_NOT_READY")
        return jsonError(
          "Replace the sample contact email in Layout Studio before publishing. Your previous live version is unchanged.",
          422,
        );
      if (message === "INVALID_SAVED_DRAFT")
        return jsonError(
          "The saved draft is invalid. Publication was not changed. Recover a valid draft in Layout Studio first.",
          422,
        );
      if (
        isUniqueWebsiteWrite(error) ||
        /requested LUCIA hostname is already owned/.test(message)
      )
        return jsonError(
          "That LUCIA address is already claimed. Choose another address or open the website that owns it.",
          409,
        );
      if (/saved website draft is incomplete/i.test(message))
        return jsonError(message, 422);
      return jsonError(
        "We couldn't save or publish the website right now. Your previous live version has been preserved. Please try again shortly.",
        503,
      );
    }
  }
  return jsonError(
    "No saved website matches this LUCIA address in an organisation you can publish for. Create the website first, then enter its exact address here.",
    404,
  );
}
