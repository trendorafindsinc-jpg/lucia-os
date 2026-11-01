import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { websitePosts, websitePostRevisions } from "@/lib/db/schema";
import { articleDraftSchema } from "@/lib/content/article-model";
import { MediaError, validateMediaOwnership, withMediaWebsite } from "@/lib/media/service";
import { websiteMutationAllowed } from "@/lib/websites/draft-revision";
export const runtime="nodejs";export const dynamic="force-dynamic";
type Context={params:Promise<{websiteId:string;articleId:string}>};
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"private,no-store"}});
async function ids(context:Context){const p=await context.params;return z.object({websiteId:z.uuid(),articleId:z.uuid()}).safeParse(p);}
export async function GET(_request:Request,context:Context){
 const user=await getCurrentUser();if(!user)return json({error:"Sign in with LUCIA ID."},401);
 const parsed=await ids(context);if(!parsed.success)return json({error:"Invalid website or article."},400);
 const {websiteId,articleId}=parsed.data;
 try{const revisions=await withMediaWebsite(user.id,websiteId,"website.read",async tx=>{
  const [post]=await tx.select({id:websitePosts.id}).from(websitePosts).where(and(eq(websitePosts.id,articleId),eq(websitePosts.websiteId,websiteId))).limit(1);
  if(!post)throw new MediaError("Article not found.",404);
  return tx.select({revision:websitePostRevisions.revision,event:websitePostRevisions.event,createdAt:websitePostRevisions.createdAt})
   .from(websitePostRevisions).where(eq(websitePostRevisions.postId,articleId)).orderBy(desc(websitePostRevisions.revision)).limit(50);
 });return json({revisions});}
 catch(error){return json({error:error instanceof MediaError?error.message:"Revision history is temporarily unavailable."},error instanceof MediaError?error.status:503);}
}
export async function POST(request:Request,context:Context){
 const user=await getCurrentUser();if(!user)return json({error:"Sign in with LUCIA ID."},401);
 if(!websiteMutationAllowed(request))return json({error:"Request origin denied."},403);
 if(request.headers.get("x-lucia-workspace-account")&&request.headers.get("x-lucia-workspace-account")!==user.id)return json({error:"Account changed. Reload Studio."},409);
 const parsed=await ids(context);if(!parsed.success)return json({error:"Invalid website or article."},400);
 let input:{currentRevision:number;targetRevision:number};
 try{const checked=z.object({currentRevision:z.number().int().positive(),targetRevision:z.number().int().positive()}).strict().safeParse(await request.json());if(!checked.success)return json({error:"Choose a valid revision."},422);input=checked.data;}catch{return json({error:"Invalid revision request."},400);}
 const {websiteId,articleId}=parsed.data;
 try{const result=await withMediaWebsite(user.id,websiteId,"website.edit",async(tx,organizationId)=>{
  const [current]=await tx.select().from(websitePosts).where(and(eq(websitePosts.id,articleId),eq(websitePosts.websiteId,websiteId),eq(websitePosts.organizationId,organizationId))).limit(1).for("update");
  if(!current)throw new MediaError("Article not found.",404);
  if(current.revision!==input.currentRevision)return {conflict:true as const};
  const [record]=await tx.select({snapshot:websitePostRevisions.snapshot}).from(websitePostRevisions).where(and(eq(websitePostRevisions.postId,articleId),eq(websitePostRevisions.organizationId,organizationId),eq(websitePostRevisions.revision,input.targetRevision))).limit(1);
  if(!record)throw new MediaError("That revision is no longer available.",404);
  const checked=articleDraftSchema.safeParse((record.snapshot as {draft?:unknown})?.draft);
  if(!checked.success)throw new MediaError("This historical entry has no restorable article draft.",422);
  const draft=checked.data;
  const altById=draft.featuredMediaRef?await validateMediaOwnership(tx,organizationId,websiteId,{featuredMediaRef:draft.featuredMediaRef}):{};
  const mediaId=draft.featuredMediaRef?draft.featuredMediaRef.slice(6):null;
  const [article]=await tx.update(websitePosts).set({title:draft.title,slug:draft.slug,excerpt:draft.excerpt,body:draft.body,category:draft.category,
   eventAt:draft.eventAt?new Date(draft.eventAt):null,isFeatured:draft.isFeatured,correctionNote:draft.correctionNote,correctsSlug:draft.correctsSlug,
   tags:draft.tags,seoTitle:draft.seoTitle,seoDescription:draft.seoDescription,featuredMediaId:mediaId,scheduledAt:null,
   status:current.publishedSnapshot?"published":"draft",revision:current.revision+1,updatedAt:new Date()
  }).where(and(eq(websitePosts.id,current.id),eq(websitePosts.organizationId,organizationId))).returning();
  const restored={...draft,featuredMediaAlt:mediaId?altById[mediaId]??draft.featuredMediaAlt:null};
  await tx.insert(websitePostRevisions).values({organizationId,websiteId,postId:article.id,actorUserId:user.id,revision:article.revision,event:"restore",
   snapshot:{draft:restored,live:current.publishedSnapshot,status:article.status,publishedSlug:current.publishedSlug,restoredFrom:input.targetRevision,at:new Date().toISOString()}});
  return {article};
 });if("conflict" in result)return json({error:"This article changed in another session. Reload before restoring.",conflict:true},409);return json(result);}
 catch(error){return json({error:error instanceof MediaError?error.message:"Revision restore failed. The current live article remains unchanged."},error instanceof MediaError?error.status:503);}
}
