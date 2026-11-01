import { and, desc, eq, ne, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { memberships, organizations, websiteMedia, websitePosts, websitePostRevisions, websites } from "@/lib/db/schema";
import { hasOrganizationPermission } from "@/lib/access/policy";
import { createArticleSchema, newArticleSlug } from "@/lib/content/article-model";
import { isUniqueWebsiteWrite, websiteMutationAllowed } from "@/lib/websites/draft-revision";
import { z } from "zod";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{websiteId:string}> };
const json = (body: unknown, status = 200) => Response.json(body,{status,headers:{"Cache-Control":"private, no-store"}});
const uuid = z.string().uuid();

export async function GET(request: Request, context: Context) {
 const user=await getCurrentUser();
 if(!user)return json({error:"Sign in with LUCIA ID."},401);
 if(request.headers.get("x-lucia-workspace-account") && request.headers.get("x-lucia-workspace-account") !== user.id) return json({error:"Account changed. Reload Studio."},409);
 const {websiteId}=await context.params;
 if(!uuid.safeParse(websiteId).success)return json({error:"Invalid website."},400);
 const data=await getDb().transaction(async tx=>{
  await tx.execute(sql`select set_config('app.current_user_id', ${user.id}, true)`);
  const orgs=await tx.select({id:organizations.id,role:memberships.role,status:memberships.status})
   .from(memberships).innerJoin(organizations,eq(memberships.organizationId,organizations.id))
   .where(and(eq(memberships.userId,user.id),eq(memberships.status,"active"),eq(organizations.status,"active")));
  for(const org of orgs){
   if(!hasOrganizationPermission({role:org.role,status:org.status},"website.read"))continue;
   await tx.execute(sql`select set_config('app.current_organization_id', ${org.id}, true)`);
   const [site]=await tx.select({id:websites.id,slug:websites.slug}).from(websites)
    .where(and(eq(websites.id,websiteId),eq(websites.organizationId,org.id),ne(websites.status,"deleted"))).limit(1);
   if(!site)continue;
   const articles=await tx.select({post:websitePosts,mediaAlt:websiteMedia.alt}).from(websitePosts)
    .leftJoin(websiteMedia,and(eq(websiteMedia.id,websitePosts.featuredMediaId),eq(websiteMedia.websiteId,site.id),eq(websiteMedia.organizationId,org.id),eq(websiteMedia.status,"ready")))
    .where(and(eq(websitePosts.websiteId,site.id),eq(websitePosts.organizationId,org.id)))
    .orderBy(desc(websitePosts.updatedAt)).limit(200);
   return {articles:articles.map(({post,mediaAlt})=>({...post,featuredMediaRef:post.featuredMediaId ? "media:"+post.featuredMediaId : null,featuredMediaAlt:mediaAlt ?? null})),siteSlug:site.slug};
  }
  return null;
 });
 return data ? json({websiteId,...data}) : json({error:"Website unavailable or access denied."},404);
}
export async function POST(request: Request, context: Context) {
 const user=await getCurrentUser();
 if(!user)return json({error:"Sign in with LUCIA ID."},401);
 if(!websiteMutationAllowed(request))return json({error:"Request origin denied."},403);
 if(request.headers.get("x-lucia-workspace-account") && request.headers.get("x-lucia-workspace-account")!==user.id)return json({error:"Account changed. Reload Studio."},409);
 const {websiteId}=await context.params;
 if(!uuid.safeParse(websiteId).success)return json({error:"Invalid website."},400);
 let raw:unknown;
 try{const body=await request.text();if(body.length>2048)return json({error:"Creation request too large."},413);raw=JSON.parse(body);}catch{return json({error:"Invalid creation request."},400);}
 const checked=createArticleSchema.safeParse(raw);
 if(!checked.success)return json({error:"Provide an article type and title."},422);
 try{
  const post=await getDb().transaction(async tx=>{
   await tx.execute(sql`select set_config('app.current_user_id', ${user.id}, true)`);
   const orgs=await tx.select({id:organizations.id,role:memberships.role,status:memberships.status})
    .from(memberships).innerJoin(organizations,eq(memberships.organizationId,organizations.id))
    .where(and(eq(memberships.userId,user.id),eq(memberships.status,"active"),eq(organizations.status,"active")));
   for(const org of orgs){
    if(!hasOrganizationPermission({role:org.role,status:org.status},"website.edit"))continue;
    await tx.execute(sql`select set_config('app.current_organization_id', ${org.id}, true)`);
    const [site]=await tx.select({id:websites.id}).from(websites)
     .where(and(eq(websites.id,websiteId),eq(websites.organizationId,org.id),ne(websites.status,"deleted"))).limit(1);
    if(!site)continue;
    const [created]=await tx.insert(websitePosts).values({
     organizationId:org.id,websiteId:site.id,authorUserId:user.id,
     kind:checked.data.kind,slug:newArticleSlug(checked.data.title),title:checked.data.title,
     excerpt:"",body:"",category:"",eventAt:null,isFeatured:false,correctionNote:null,correctsSlug:null,tags:[],seoTitle:null,seoDescription:null,status:"draft",revision:1,
    }).returning();
    await tx.insert(websitePostRevisions).values({
     organizationId:org.id,websiteId:site.id,postId:created.id,
     actorUserId:user.id,revision:1,event:"create",
     snapshot:{title:created.title,slug:created.slug,body:"",status:"draft"},
    });
    return created;
   }
   return null;
  });
  return post ? json({article:{...post,featuredMediaRef:null,featuredMediaAlt:null}},201) : json({error:"Website unavailable or editing denied."},404);
 }catch(error){
  if(isUniqueWebsiteWrite(error))return json({error:"An article with this title already exists. Choose a different title."},409);
  return json({error:"Article could not be created. No changes were published."},503);
 }
}
