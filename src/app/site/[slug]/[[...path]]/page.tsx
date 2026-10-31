import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { isPlatformHostname } from "@/lib/publishing/platform-hosts";
import { PublicWebsite } from "@/lib/domains/public-site";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { websiteDomains, websitePages, websites } from "@/lib/db/schema";
import {
  websiteDefinitionSchema,
  isPremium,
  websiteBlueprint,
} from "@/lib/layout-blueprint/website-definition";

import { LayoutRenderer } from "@/components/layout-studio/layout-renderer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = { params: Promise<{ slug: string; path?: string[] }> };

export default async function PublishedWebsitePage({ params }: PageProps) {
  const { slug, path = [] } = await params;
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
      if (binding)
        return await PublicWebsite({
          path: path.length ? path.join("/") : "/",
        });
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
    const pagePath = path.length ? "/" + path.join("/") : "/";
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
    return (
      <LayoutRenderer
        blueprint={websiteBlueprint(parsed.data, pagePath, page.title)}
        pagePath={pagePath}
      />
    );
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    notFound();
  }
}
