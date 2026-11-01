import "server-only";
import Link from "next/link";
import Image from "next/image";
import { cache } from "react";
import type { Metadata, Route } from "next";
import { and, desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { normalizeHostname } from "@/lib/domains/hostname";
import { articleDraftSchema, articleRoute } from "@/lib/content/article-model";
import { websiteDomains, websitePosts, websites, organizations } from "@/lib/db/schema";
import styles from "./public-articles.module.css";
import { renderArticleMarkdown } from "./rich-content";

export function isArticlePath(path: string) {
 return /^(?:\/)?(?:blog|news)(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?\/?$/.test(path);
}
const readPublished = cache(async (path: string) => {
 const segments=path.replace(/^\/|\/$/g,"").split("/");
 const kind=segments[0],slug=segments[1] ?? null;
 if ((kind!=="blog" && kind!=="news") || segments.length>2) notFound();
 const host=(await headers()).get("host");
 if(!host)notFound();
 let hostname:string;
 try{hostname=normalizeHostname(new URL("http://"+host).hostname);}catch{notFound();}
 const db=getDb();
 const [site]=await db.select({id:websites.id,organizationId:websites.organizationId,name:websites.name})
  .from(websiteDomains).innerJoin(websites,and(eq(websiteDomains.websiteId,websites.id),eq(websiteDomains.organizationId,websites.organizationId)))
  .innerJoin(organizations,e¶»§q«^