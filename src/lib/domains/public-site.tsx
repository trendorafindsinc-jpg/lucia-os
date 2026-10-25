import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { websiteDomains, websitePages, websiteStructures, websites } from "@/lib/db/schema";
import { normalizeHostname } from "@/lib/domains/hostname";
import { siteDraftSchema } from "@/lib/editor/site-draft";
import { siteDraftToLoomBlueprint, type LoomBlueprint } from "@/lib/loom/blueprint";
import { LoomRenderer } from "@/components/loom/loom-renderer";
import { siteStructurePageToBlueprint } from "@/lib/site-structure/loom-adapter";
import { siteStructureSchema } from "@/lib/site-structure/structure";

export async function PublicWebsite({ path }: { path: string }) {
  const requestHeaders = await headers();
  const rawHost = requestHeaders.get("host");
  if (!rawHost) notFound();

  let hostname: string;
  try {
    hostname = normalizeHostname(new URL(`http://${rawHost}`).hostname);
  } catch {
    notFound();
  }

  const cleanPath = path === "/" ? "/" : `/${path.split("/").filter(Boolean).join("/")}`;
  const db = getDb();
  const [record] = await db
    .select({
      websiteId: websiteDomains.websiteId,
      organizationId: websiteDomains.organizationId,
    })
    .from(websiteDomains)
    .innerJoin(websites, and(
      eq(websites.id, websiteDomains.websiteId),
      eq(websites.organizationId, websiteDomains.organizationId),
    ))
    .where(and(
      eq(websiteDomains.hostname, hostname),
      eq(websiteDomains.status, "active"),
      eq(websites.status, "published"),
    ))
    .limit(1);

  if (!record) notFound();

  const pageData = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_organization_id', ${record.organizationId}, true)`);
    const [page] = await tx.select({ title: websitePages.title, path: websitePages.path, publishedContent: websitePages.publishedContent })
      .from(websitePages)
      .where(and(
        eq(websitePages.organizationId, record.organizationId),
        eq(websitePages.websiteId, record.websiteId),
        eq(websitePages.path, cleanPath),
        eq(websitePages.status, "published"),
      )).limit(1);
    const [savedStructure] = await tx.select({ structure: websiteStructures.publishedStructure })
      .from(websiteStructures)
      .where(and(eq(websiteStructures.organizationId, record.organizationId), eq(websiteStructures.websiteId, record.websiteId)))
      .limit(1);
    return { page: page ?? null, publishedStructure: savedStructure?.structure ?? null };
  });

  if (!pageData.page?.publishedContent) notFound();
  let raw: unknown;
  try {
    raw = JSON.parse(pageData.page.publishedContent);
  } catch {
    notFound();
  }
  const parsed = siteDraftSchema.safeParse(raw);
  if (!parsed.success) notFound();

  let blueprint: LoomBlueprint;
  try {
    if (pageData.publishedStructure) {
      let structureRaw: unknown;
      try { structureRaw = JSON.parse(pageData.publishedStructure); } catch { notFound(); }
      const structure = siteStructureSchema.safeParse(structureRaw);
      if (!structure.success) notFound();
      const selectedPage = structure.data.pages.find((item) => (item.slug ? `/${item.slug}` : "/") === cleanPath);
      if (!selectedPage) notFound();
      blueprint = siteStructurePageToBlueprint(parsed.data, structure.data, selectedPage.id);
    } else {
      blueprint = siteDraftToLoomBlueprint({
        ...parsed.data,
        ...(pageData.page.path !== "/" ? { headline: pageData.page.title } : {}),
      });
    }
  } catch {
    notFound();
  }

  return <LoomRenderer blueprint={blueprint} />;
}
