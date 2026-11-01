import { z } from "zod";
import { makeSlug } from "@/lib/content/content-library";
import { mediaReferencePattern } from "@/lib/media/references";

// Initial production-safe plain-text format: JSX escapes output; HTML paste is not executed.
// Rich blocks and media links follow only after dedicated sanitization and reference verification.
export const articleKind = z.enum(["blog","news"]);
export const articleDraftSchema = z.object({
  kind: articleKind,
  title: z.string().trim().min(1).max(150),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  excerpt: z.string().max(320),
  body: z.string().max(50000),
  category: z.string().trim().max(80),
  authorName: z.string().trim().max(80).nullable().default(null),
  eventAt: z.string().datetime().nullable().default(null),
  isFeatured: z.boolean().default(false),
  correctionNote: z.string().trim().max(500).nullable().default(null),
  correctsSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120).nullable().default(null),
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
export const updateArticleSchema = articleDraftSchema.omit({kind:true,featuredMediaAlt:true,authorName:true}).extend({
  revision: z.number().int().positive(),
  action: z.enum(["save","publish","unpublish","schedule"]),
  scheduledAt: z.string().datetime().nullable().default(null),
}).strict().superRefine((value, context) => {
 if(value.action==="schedule"&&!value.scheduledAt)context.addIssue({code:"custom",path:["scheduledAt"],message:"Choose a publication date and time."});
});
export type PublishedArticle = z.infer<typeof articleDraftSchema>;
export type ArticleKind = z.infer<typeof articleKind>;
export function newArticleSlug(title: string) { return makeSlug(title); }
export function publicationReady(article: PublishedArticle) {
  return article.title.length > 0 && article.body.trim().length >= 20 && article.excerpt.trim().length >= 10;
}
export function articleRoute(kind: ArticleKind, slug: string) {
  return "/" + (kind === "blog" ? "blog" : "news") + "/" + slug;
}
