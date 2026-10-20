import "server-only";

import type { CSSProperties } from "react";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { websiteDomains, websitePages, websites } from "@/lib/db/schema";
import { normalizeHostname } from "@/lib/domains/hostname";
import { editorPalettes, siteDraftSchema } from "@/lib/editor/site-draft";

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

  const [page] = await db
    .select({ title: websitePages.title, path: websitePages.path, publishedContent: websitePages.publishedContent })
    .from(websitePages)
    .where(and(
      eq(websitePages.organizationId, record.organizationId),
      eq(websitePages.websiteId, record.websiteId),
      eq(websitePages.path, cleanPath),
      eq(websitePages.status, "published"),
    ))
    .limit(1);

  if (!page?.publishedContent) notFound();
  let raw: unknown;
  try {
    raw = JSON.parse(page.publishedContent);
  } catch {
    notFound();
  }
  const parsed = siteDraftSchema.safeParse(raw);
  if (!parsed.success) notFound();

  const draft = parsed.data;
  const colors = editorPalettes[draft.palette];
  const theme = {
    background: colors[2],
    color: colors[0],
    minHeight: "100vh",
    padding: "clamp(1.5rem, 5vw, 5rem)",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  } satisfies CSSProperties;

  return (
    <main style={theme}>
      <header style={{ maxWidth: 1080, margin: "0 auto", paddingBottom: "clamp(4rem, 12vh, 9rem)" }}>
        <p style={{ fontSize: ".8rem", letterSpacing: ".16em", textTransform: "uppercase", opacity: .72 }}>
          {draft.siteName}
        </p>
        <h1 style={{ fontSize: "clamp(2.8rem, 8vw, 6.5rem)", lineHeight: 1.02, letterSpacing: "-.055em", maxWidth: 900, margin: "1.5rem 0" }}>
          {page.path === "/" ? draft.headline : page.title}
        </h1>
        <p style={{ maxWidth: 680, fontSize: "clamp(1.05rem, 2vw, 1.35rem)", lineHeight: 1.7, opacity: .82 }}>
          {draft.description}
        </p>
        <a href="#website-sections" style={{ display: "inline-block", marginTop: "2rem", padding: ".9rem 1.2rem", borderRadius: 999, background: colors[0], color: colors[2], textDecoration: "none", fontWeight: 650 }}>
          {draft.buttonLabel}
        </a>
      </header>
      <section id="website-sections" style={{ maxWidth: 1080, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: "1rem" }}>
        {draft.visibleSections.map((section, index) => (
          <article key={section} style={{ border: "1px solid " + colors[0] + "22", borderRadius: 24, padding: "1.5rem", background: "#ffffff70", minHeight: 150 }}>
            <p style={{ fontSize: ".75rem", letterSpacing: ".12em", opacity: .65 }}>0{index + 1}</p>
            <h2 style={{ fontSize: "1.35rem", letterSpacing: "-.025em" }}>{section}</h2>
          </article>
        ))}
      </section>
      <footer style={{ maxWidth: 1080, margin: "5rem auto 0", paddingTop: "1.5rem", borderTop: "1px solid " + colors[0] + "22", fontSize: ".85rem", opacity: .72 }}>
        Published with LUCIA OS
      </footer>
    </main>
  );
}
