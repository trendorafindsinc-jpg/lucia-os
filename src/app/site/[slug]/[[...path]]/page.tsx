import { and, eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { websitePages, websiteStructures, websites } from "@/lib/db/schema";
import { siteDraftSchema } from "@/lib/editor/site-draft";
import { siteDraftToLoomBlueprint, type LoomBlueprint } from "@/lib/loom/blueprint";
import { siteStructurePageToBlueprint } from "@/lib/site-structure/loom-adapter";
import { siteStructureSchema } from "@/lib/site-structure/structure";
import { LoomRenderer } from "@/components/loom/loom-renderer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = { params: Promise<{ slug: string; path?: string[] }> };

export default async function PublishedWebsitePage({ params }: PageProps) {
  const { slug, path = [] } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) notFound();

  try {
    const db = getDb();
    const [website] = await db.select({
      id: websites.id,
      organizationId: websites.organizationId,
    }).from(websites).where(and(eq(websites.slug, slug), eq(websites.status, "published"))).limit(1);

    if (!website) notFound();
    const pagePath = path.length ? "/" + path.join("/") : "/";
    const pageData = await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.current_organization_id', ${website.organizationId}, true)`);
      const [page] = await tx.select({
        title: websitePages.title,
        path: websitePages.path,
        publishedContent: websitePages.publishedContent,
      }).from(websitePages).where(and(
        eq(websitePages.websiteId, website.id),
        eq(websitePages.organizationId, website.organizationId),
        eq(websitePages.path, pagePath),
        eq(websitePages.status, "published"),
      )).limit(1);
      const [savedStructure] = await tx.select({ structure: websiteStructures.structure })
        .from(websiteStructures)
        .where(and(eq(websiteStructures.websiteId, website.id), eq(websiteStructures.organizationId, website.organizationId)))
        .limit(1);
      return { page: page ?? null, savedStructure: savedStructure?.structure ?? null };
    });

    if (!pageData.page?.publishedContent) notFound();
    let raw: unknown;
    try { raw = JSON.parse(pageData.page.publishedContent); } catch { notFound(); }
    const parsed = siteDraftSchema.safeParse(raw);
    if (!parsed.success) notFound();

    let blueprint: LoomBlueprint;
    try {
      if (pageData.savedStructure) {
        let structureRaw: unknown;
        try { structureRaw = JSON.parse(pageData.savedStructure); } catch { notFound(); }
        const structure = siteStructureSchema.safeParse(structureRaw);
        if (!structure.success) notFound();
        const selectedPage = structure.data.pages.find((item) => (item.slug ? `/${item.slug}` : "/") === pagePath);
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
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    notFound();
  }
}
