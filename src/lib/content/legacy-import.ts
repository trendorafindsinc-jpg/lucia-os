import { makeSlug, type BlogPost } from "@/lib/content/content-library";
/** Deterministic draft-only mapping; legacy status labels never grant public visibility. */
export function legacyArticleDraft(post:BlogPost,usedSlugs:Set<string>){
 const title=post.title.trim().slice(0,150);
 const base=makeSlug(post.slug||title).slice(0,110);
 let slug=base,sequence=2;
 while(usedSlugs.has(slug))slug=(base+"-"+sequence++).slice(0,120);
 usedSlugs.add(slug);
 return {sourceId:post.id,title,slug,excerpt:post.excerpt,body:post.body,tags:post.tags,status:"draft" as const,legacyStatus:post.status};
}
