import "server-only";
import { cache } from "react";
import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { websiteDomains, websitePages, websites } from "@/lib/db/schema";
import { normalizeHostname } from "@/lib/domains/hostname";
import {
  websiteDefinitionSchema,
  isPremium,
  websiteBlueprint,
  websitePageDetails,
} from "@/lib/layout-blueprint/website-definition";
import { LayoutRenderer } from "@/components/layout-studio/layout-renderer";
import { isArticlePath, publicArticleMetadata, PublicArticlePage } from "@/lib/content/public-articles";

// React cache is request-local: metadata and rendering share one resolution;
// requests for different tenant hosts never share cached authorization/data.
export const readPublicWebsitePage = cache(async (path: string) => {
  const rawHost = (await headers()).get("host");
  if (!rawHost) notFound();
  let hostname: string;
  try {
    hostname = normalizeHostname(new URL(`http://${rawHost}`).hostname);
  } catch {
    notFound();
  }
  const cleanPath =
    path === "/" ? "/" : `/${path.split("/").filter(Boolean).join("/")}`;
  const db = getDb();
  const [record] = await db
    .select({
      websiteId: websiteDomains.websiteId,
      organizationId: websiteDomains.organizationId,
    })
    .from(websiteDomains)
    .innerJoin(
      websites,
      and(
        eq(websites.id, websiteDomains.websiteId),
        eq(websites.organizationId, websiteDomains.organizationId),
      ),
    )
    .where(
      and(
        eq(websiteDomains.hostname, hostname),
        eq(websiteDomains.status, "active"),
        eq(websites.status, "published"),
      ),
    )
    .limit(1);
  if (!record) notFound();
  const [page] = await db
    .select({
      title: websitePages.title,
      publishedContent: websitePages.publishedContent,
    })
    .from(websitePages)
    .where(
      and(
        eq(websitePages.organizationId, record.organizationId),
        eq(websitePages.websiteId, record.websiteId),
        eq(websitePages.path, cleanPath),
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
  if (
    !parsed.success ||
    (isPremium(parsed.data) &&
      !parsed.data.pages.some((p) => p.path === cleanPath))
  )
    notFound();
  return {
    blueprint: websiteBlueprint(parsed.data, cleanPath, page.title),
    pagePath: cleanPath,
    ...websitePageDetails(parsed.data, cleanPath, page.title),
  };
});
export async function publicWebsiteMetadata(path: string): Promise<Metadata> {
  if (isArticlePath(path)) return publicArticleMetadata(path);
  const page = await readPublicWebsitePage(path);
  return { title: { absolute: page.title }, description: page.description };
}
export async function PublicWebsite({ path }: { path: string }) {
  if (isArticlePath(path)) return <PublicArticlePage path={path} />;
  const page = await readPublicWebsitePage(path);
  return <LayoutRenderer blueprint={page.blueprint} pagePath={page.pagePath} />;
}
