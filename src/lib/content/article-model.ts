import { z } from "zod";
import { makeSlug } from "@/lib/content/content-library";
import { mediaReferencePattern } from "@/lib/media/references";

// Article data is normalized in PostgreSQL; public snapshots include only validated metadata and safe Markdown.
export const articleKind = z.enum(["blog","news"]);
export const articleDraftSchema = z.object({
  kind: articleKind,
  title: z.string().trim().min(1).max(150),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  excerpt: z.string().max(320),
  body: z.string().max(50000),
  category: z.string().trim().max(80),
  tags: z.array(z.string().trim().min(1).max(32)).max(12).default([]),
  seoTitle: z.string().trim().max(70).nullable().default(null),
  seoDescription: z.string().trim().max(160).nullable().default(null),
  featuredMediaRef: z.string().regex(mediaReferencePattern).nullable().default(null),
  featuredMediaAlt: z.string().max(200).nullable().default(null),
}).strict();
export const createArticleSchema = z.object({
  kind: articleKind,
  title: z.string().trim().min(1).max(150),
}).strict();
export const updateArticleSchema = articleDraftSchema.omit({kind:true,featuredMediaAlt:true}).extend({
  revision: z.number().int().positive(),
  action: z.enum(["save","publish","unpublish"]),
}).strict();
export type PublishedArticle = z.infer<typeof articleDraftSchema>;
export type ArticleKind = z.infer<typeof articleKind>;
export function newArticleSlug(title: string) { return makeSlug(title); }
export function publicationReady(article: PublishedArticle) {
  return article.title.length > 0 && article.body.trim().length >= 20 && article.excerpt.trim().length >= 10;
}
export function articleRoute(kind: ArticleKind, slug: string) {
  return "/" + (kind === "blog" ? "blog" : "news") + "/" + slug;
}
