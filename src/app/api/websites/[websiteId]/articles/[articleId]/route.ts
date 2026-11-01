import { and, eq, ne, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { appUsers, memberships, organizations, websitePosts, websitePostRevisions, websites } from "@/lib/db/schema";
import { hasOrganizationPermission } from "@/lib/access/policy";
import { updateArticleSchema, publicationReady, type PublishedArticle } from "@/lib/content/article-model";
import { isUniqueWebsiteWrite, websiteMutationAllowed } from "@/lib/websites/draft-revision";
import { MediaError, validateMediaOwnership } from "@/lib/media/service";
import { z } from "zod";
export const runtime="nodejs";
export const dynamic="force-dynamic";
type Context={params:Promise<{websiteId:string;articleId:string}>};
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"private, no-store"}});
export async function PATCH(request:Request,context:Context){
 const user=await getCurrentUser();
 if(!user)return json({error:"Sign in with LUCIA ID."},401);
 if(!websiteMutationAllowed(request))return json({error:"Request origin denied."},403);
 if(request.headers.get("x-lucia-workspace-account") && request.headers.get("x-lucia-workspace-account")!==user.id)return json({error:"Account changed. Reload Studio."},409);
 const {websiteId,articleId}=await context.params;
 if(!z.uuid().safeParse(websiteId).success || !z.uuid().safeParse(articleId).success)return json({error:"Invalid website or article."},400);
 let raw:unknown;
 try{const body=await request.text();if(body.length>60000)return json({error:"Article exceeds request size limit."},413);raw=JSON.parse(body);}catch{return json({error:"Invalid article."},400);}
 const parsed=updateArticleSchema.safeParse(raw);
 if(!parsed.success)return json({error:"Check the article fields and revision.",issues:parsed.error.flatten()},422);
 const input=parsed.data;
 try{
  const outcome=await getDb().transaction(async tx=>{
   await tx.execute(sql`select set_config('app.current_user_id', ${user.id}, true)`);
   const orgs=await tx.select({id:organizations.id,role:memberships.role,status:memberships.status})
    .from(memberships).innerJoin(organizations,eq(memberships.organizationId,organizations.id))
    .where(and(eq(memberships.userId,user.id),eq(memberships.status,"active"),eq(organizations.status,"active")));
   for(const org of orgs){
    if(!hasOrganizationPermission({role:org.role,status:org.status},"website.edit"))continue;
    if(input.action!=="save" && !hasOrganizationPermission({role:org.role,status:org.status},"website.publish"))continue;
    await tx.execute(sql`select set_config('app.current_organization_id', ${org.id}, true)`);
    const [site]=await tx.select({id:websites.id,status:websites.status}).from(websites)
     .where(and(eq(websites.id,websiteId),eq(websites.organizationId,org.id),ne(websites.status,"deleted"))).limit(1);
    if(!site)continue;
    const [current]=await tx.select().from(websitePosts).where(and(
     eq(websitePosts.id,articleId),eq(websitePosts.websiteId,websiteId),eq(websitePosts.organizationId,org.id)
    )).limit(1).for("update");
    if(!current)continue;
    if(current.revision!==input.revision)return {conflict:true as const};
    if((input.action==="publish" || input.action==="schedule") && site.status!=="published")return {validation:"Publish the website before publishing articles."};
    if(input.action==="schedule" && current.publishedSnapshot)return {validation:"Unpublish this article before scheduling a new publication. Existing live content is never replaced by a queued draft."};
    if(input.action==="schedule"){const at=new Date(input.scheduledAt!);if(!Number.isFinite(at.getTime())||at.getTime()<Date.now()+120000||at.getTime()>Date.now()+365*86400000)return {validation:"Choose a publication time at least two minutes from now and within the next year."};}
    if(input.action==="publish"){
     const reserved=await tx.execute(sql`select post_id from website_post_slug_redirects where organization_id=${org.id} and website_id=${site.id} and kind=${current.kind} and old_slug=${input.slug} limit 1 for update`);
     const existingRedirect=reserved[0] as {post_id:string}|undefined;
     if(existingRedirect&&existingRedirect.post_id!==current.id)return {validation:"This article address is reserved by a permanent redirect. Choose another URL."};
     if(current.publishedSlug&&current.publishedSlug!==input.slug){
      await tx.execute(sql`insert into website_post_slug_redirects(organization_id,website_id,post_id,kind,old_slug) values(${org.id},${site.id},${current.id},${current.kind},${current.publishedSlug}) on conflict(organization_id,website_id,kind,old_slug) do update set post_id=excluded.post_id,created_at=now()`);
     }
    }
    const mediaAltById=input.action==="unpublish" ? {} : await validateMediaOwnership(tx,org.id,site.id,{featuredMediaRef:input.featuredMediaRef,body:input.body},input.action==="publish");
    const featuredMediaId=input.featuredMediaRef ? input.featuredMediaRef.slice(6) : null;
    const featuredMediaAlt=featuredMediaId ? mediaAltById[featuredMediaId] ?? null : null;
    const [author]=await tx.select({displayName:appUsers.displayName}).from(appUsers).where(eq(appUsers.id,user.id)).limit(1);
    const draft:PublishedArticle={kind:current.kind as "blog"|"news",title:input.title,slug:input.slug,excerpt:input.excerpt,body:input.body,category:input.category,authorName:author?.displayName?.trim()||null,eventAt:input.eventAt,isFeatured:input.isFeatured,correctionNote:input.correctionNote,correctsSlug:input.correctsSlug,tags:input.tags,seoTitle:input.seoTitle,seoDescription:input.seoDescription,featuredMediaRef:input.featuredMediaRef,featuredMediaAlt};
    if((input.action==="publish" || input.action==="schedule") && !publicationReady(draft))return {validation:"Add a meaningful summary and article body before publishing."};
    const live=input.action==="publish"?draft:input.action==="unpublish"||input.action==="schedule"?null:current.publishedSnapshot;
    const status=input.action==="schedule"?"scheduled":live?"published":"draft";
    const publishedSlug=live ? (input.action==="publish" ? draft.slug : current.publishedSlug) : null;
    const [saved]=await tx.update(websitePosts).set({
     title:input.title,slug:input.slug,excerpt:input.excerpt,body:input.body,category:input.category,eventAt:input.eventAt?new Date(input.eventAt):null,isFeatured:input.isFeatured,correctionNote:input.correctionNote,correctsSlug:input.correctsSlug,tags:input.tags,seoTitle:input.seoTitle,seoDescription:input.seoDescription,featuredMediaId,
     revision:current.revision+1,status,publishedSnapshot:live,publishedSlug,
     publishedAt:live ? (input.action==="publish" ? new Date() : current.publishedAt) : null,
     scheduledAt:input.action==="schedule"?new Date(input.scheduledAt!):null,updatedAt:new Date(),
    }).where(and(eq(websitePosts.id,current.id),eq(websitePosts.organizationId,org.id))).returning();
    await tx.insert(websitePostRevisions).values({
     organizationId:org.id,websiteId:site.id,postId:saved.id,actorUserId:user.id,
     revision:saved.revision,event:input.action,
     snapshot:{draft,live,status,publishedSlug,at:new Date().toISOString()},
    });
    return {article:{...saved,featuredMediaRef:input.featuredMediaRef,featuredMediaAlt}};
   }
   return null;
  });
  if(!outcome)return json({error:"Article unavailable or permission denied."},404);
  if("conflict" in outcome)return json({error:"This article changed in another session. Reload before saving."},409);
  if("validation" in outcome)return json({error:outcome.validation},422);
  return json(outcome);
 }catch(error){
  if(error instanceof MediaError)return json({error:error.message},error.status);
  if(isUniqueWebsiteWrite(error))return json({error:"This article address is already in use on this website."},409);
  return json({error:"Article save or publication failed. The previous live version was preserved."},503);
 }
}
