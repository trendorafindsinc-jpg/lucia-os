import { z } from "zod";

export const postStatuses = ["draft", "review", "scheduled", "published", "archived"] as const;
export const mediaKinds = ["image", "video", "document"] as const;

export const blogPostSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,64}$/),
  title: z.string().trim().min(1).max(120),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  excerpt: z.string().max(320),
  body: z.string().max(50000),
  status: z.enum(postStatuses),
  tags: z.array(z.string().min(1).max(32)).max(12),
  featuredImageId: z.string().max(64).nullable(),
  updatedAt: z.string().datetime(),
}).strict();

const mediaSourceSchema = z.string().trim().min(1).max(2048).refine((value) => {
  if (value.startsWith("https://")) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
    } catch { return false; }
  }
  // Storage keys are opaque identifiers, never filesystem paths or executable URLs.
  return /^[A-Za-z0-9][A-Za-z0-9/_-]*(?:\\.[A-Za-z0-9_-]+)?$/.test(value)
    && !value.split("/").some((part) => part === "." || part === "..");
}, "Use an HTTPS URL or a safe storage key.");

export const mediaAssetSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,64}$/),
  name: z.string().trim().min(1).max(120),
  kind: z.enum(mediaKinds),
  source: mediaSourceSchema,
  altText: z.string().max(300),
  caption: z.string().max(500),
  createdAt: z.string().datetime(),
}).strict();

export const contentLibrarySchema = z.object({
  posts: z.array(blogPostSchema).max(500),
  assets: z.array(mediaAssetSchema).max(1000),
}).superRefine((library, ctx) => {
  const ids = library.posts.map((post) => post.id);
  const slugs = library.posts.map((post) => post.slug);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", path: ["posts"], message: "Post IDs must be unique." });
  if (new Set(slugs).size !== slugs.length) ctx.addIssue({ code: "custom", path: ["posts"], message: "Post slugs must be unique." });
  const assets = new Set(library.assets.map((asset) => asset.id));
  if (assets.size !== library.assets.length) ctx.addIssue({ code: "custom", path: ["assets"], message: "Media IDs must be unique." });
  library.posts.forEach((post, index) => {
    if (post.featuredImageId && !assets.has(post.featuredImageId)) ctx.addIssue({ code: "custom", path: ["posts", index, "featuredImageId"], message: "Featured image must exist." });
  });
});

export type BlogPost = z.infer<typeof blogPostSchema>;
export type MediaAsset = z.infer<typeof mediaAssetSchema>;
export type ContentLibrary = z.infer<typeof contentLibrarySchema>;

export function makeSlug(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120).replace(/-+$/g, "") || "untitled";
}
export function makeEmptyLibrary(): ContentLibrary { return { posts: [], assets: [] }; }

export function addPost(library: ContentLibrary, title: string, now = new Date()): ContentLibrary {
  const cleanTitle = title.trim().slice(0, 120);
  if (!cleanTitle || library.posts.length >= 500) return library;
  const base = makeSlug(cleanTitle);
  let slug = base;
  let suffix = 2;
  while (library.posts.some((post) => post.slug === slug)) slug = `${base}-${suffix++}`;
  const id = `post-${slug}`.slice(0, 64);
  return { ...library, posts: [...library.posts, { id, title: cleanTitle, slug, excerpt: "", body: "", status: "draft", tags: [], featuredImageId: null, updatedAt: now.toISOString() }] };
}

export function addMediaAsset(library: ContentLibrary, asset: MediaAsset): ContentLibrary {
  if (library.assets.length >= 1000 || library.assets.some((item) => item.id === asset.id)) return library;
  return { ...library, assets: [...library.assets, asset] };
}
