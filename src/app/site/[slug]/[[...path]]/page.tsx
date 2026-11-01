import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { isPlatformHostname } from "@/lib/publishing/platform-hosts";
import { cache } from "react";
import type { Metadata } from "next";
import { readPublicWebsitePage } from "@/lib/domains/public-site";
import { isArticlePath, publicArticleMetadata, PublicArticlePage, PublicContentHighlights } from "@/lib/content/public-articles";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { websiteDomains, websitePages, websites } from "@/lib/db/schema";
import {
  websiteDefinitionSchema,
  isPremium,
  websiteBlueprint,
  websitePageDetails,
} from "@/lib/layout-blueprint/website-definition";

import { LayoutRenderer } from "@/components/layout-studio/layout-renderer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = { params: Promise<{ slug: string; path?: string[] }>; searchParams: Promise<Record<string,string|string[]|undefined>> };

const readSitePage = cache(async (slug: string, path: string) => {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) notFound();

  try {
    const host = (await headers()).get("host");
    if (!host) notFound();
    const hostname = new URL(`http://${host}`).hostname
      .toLowerCase()
      .replace(/\.$/, "");
    const db = getDb();
    const platform = isPlatformHostname(hostname);
    if (!platform) {
      const [binding] = await db
        .select({ id: websiteDomains.id })
        .from(websiteDomains)
        .where(
          and(
            eq(websiteDomains.hostname, hostname),
            eq(websiteDomains.status, "active"),
          ),
        )
        .limit(1);
      // An explicit binding always wins over tenant-local, nonunique slugs.
      if (binding) return await readPublicWebsitePage(path);
    }
    // Preserve pre-domain-table v1 URLs without inventing a binding or migrating
    // customer data. Ambiguous legacy slugs fail closed; v2 requires a binding.
    const candidates = await db
      .select({
        id: websites.id,
        organizationId: websites.organizationId,
      })
      .from(websites)
      .where(and(eq(websites.slug, slug), eq(websites.status, "published")))
      .limit(2);

    const website = candidates.length === 1 ? candidates[0] : null;
    if (!website) notFound();
    const pagePath = path === "/" ? "/" : "/" + path;
    const [page] = await db
      .select({
        title: websitePages.title,
        path: websitePages.path,
        publishedContent: websitePages.publishedContent,
      })
      .from(websitePages)
      .where(
        and(
          eq(websitePages.websiteId, website.id),
          eq(websitePages.organizationId, website.organizationId),
          eq(websitePages.path, pagePath),
          eq(websitePages.status, "published"),
        ),
      )
      .limit(1);

    if (!page?.publishedContent) notFound();
    let raw: unknown;
    try {
      raw = JSON.parse(page.publishedContent);
    } catch {
      notFound();
    }
    const parsed = websiteDefinitionSchema.safeParse(raw);
    if (!parsed.success || (!platform && isPremium(parsed.data))) notFound();
    if (
      isPremium(parsed.data) &&
      !parsed.data.pages.some((p) => p.path === pagePath)
    )
      notFound();
    return {
      blueprint: websiteBlueprint(parsed.data, pagePath, page.title),
      pagePath,
      ...websitePageDetails(parsed.data, pagePath, page.title),
    };
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    notFound();
  }
});
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug, path = [] } = await params;
  const routePath=path.join("/");
  if(isArticlePath(routePath))return publicArticleMetadata(routePath,slug);
  const page = await readSitePage(slug, path.length ? routePath : "/");
  return { title: { absolute: page.title }, description: page.description };
}
export default async function PublishedWebsitePage({ params, searchParams }: PageProps) {
  const [{ slug, path = [] }, query] = await Promise.all([params, searchParams]);
  const routePath=path.join("/");
  if(isArticlePath(routePath))return <PublicArticlePage path={routePath} searchParams={query} websiteSlug={slug} />;
  const page = await readSitePage(slug, path.length ? routePath : "/");
  return <><LayoutRenderer blueprint={page.blueprint} pagePath={page.pagePath} />{page.pagePath === "/" ? <PublicContentHighlights websiteSlug={slug} /> : null}</>;
}
