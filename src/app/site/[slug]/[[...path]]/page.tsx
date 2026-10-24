import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { websitePages, websites } from "@/lib/db/schema";
import { siteDraftSchema } from "@/lib/editor/site-draft";
import { siteDraftToLoomBlueprint, type LoomBlueprint } from "@/lib/loom/blueprint";
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
    const [page] = await db.select({
      title: websitePages.title,
      path: websitePages.path,
      publishedContent: websitePages.publishedContent,
    }).from(websitePages).where(and(
      eq(websitePages.websiteId, website.id),
      eq(websitePages.organizationId, website.organizationId),
      eq(websitePages.path, pagePath),
      eq(websitePages.status, "published"),
    )).limit(1);

    if (!page?.publishedContent) notFound();
    let raw: unknown;
    try { raw = JSON.parse(page.publishedContent); } catch { notFound(); }
    const parsed = siteDraftSchema.safeParse(raw);
    if (!parsed.success) notFound();

    let blueprint: LoomBlueprint;
    try {
      blueprint = siteDraftToLoomBlueprint({
        ...parsed.data,
        ...(page.path !== "/" ? { headline: page.title } : {}),
      });
    } catch {
      notFound();
    }

    return <LoomRenderer blueprint={blueprint} />;
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    notFound();
  }
}
