import "server-only";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { websiteDomains, websitePages, websites } from "@/lib/db/schema";
import { normalizeHostname } from "@/lib/domains/hostname";

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
      websiteStatus: websites.status,
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

  const [page] = await db
    .select({ title: websitePages.title, content: websitePages.content })
    .from(websitePages)
    .where(and(
      eq(websitePages.organizationId, record.organizationId),
      eq(websitePages.websiteId, record.websiteId),
      eq(websitePages.path, cleanPath),
      eq(websitePages.status, "published"),
    ))
    .limit(1);

  if (!page) notFound();

  return (
    <main className="public-website" style={{ maxWidth: 920, margin: "0 auto", padding: "48px 24px", lineHeight: 1.7 }}>
      <article>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", lineHeight: 1.1 }}>{page.title}</h1>
        <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{page.content}</div>
      </article>
    </main>
  );
}
