import "server-only";

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
} from "@/lib/layout-blueprint/website-definition";

import { LayoutRenderer } from "@/components/layout-studio/layout-renderer";

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
      path: websitePages.path,
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
  if (!parsed.success) notFound();
  if (
    isPremium(parsed.data) &&
    !parsed.data.pages.some((p) => p.path === cleanPath)
  )
    notFound();
  return (
    <LayoutRenderer
      blueprint={websiteBlueprint(parsed.data, cleanPath, page.title)}
      pagePath={cleanPath}
    />
  );
}
