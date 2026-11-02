import { and, eq, ne, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { hasOrganizationPermission } from "@/lib/access/policy";
import { getDb } from "@/lib/db/client";
import { memberships, organizations, websiteContentLibraries, websiteMedia, websitePosts, websitePostRevisions, websites } from "@/lib/db/schema";
import { contentLibrarySchema, makeSlug } from "@/lib/content/content-library";
import { websiteMutationAllowed } from "@/lib/websites/draft-revision";
import { z } from "zod";
export const runtime="nodejs";
export const dynamic="force-dynamic";
type Context={params:Promise<{websiteId:string}>};
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"private, no-store"}});
export async function POST(request:Request,context:Context){
 const user=await getCurrentUser();
 if(!user)return json({error:"Sign in with LUCIA ID."},401);
 if(!websiteMutationAllowed(request))return json({error:"Request origin denied."},403);
 if(request.headers.get("x-lucia-workspace-account") && request.headers.get("x-lucia-workspace-account")!==user.id)return json({error:"Account changed. Reload Studio."},409);
 const {websiteId}=await context.params;
 if(!z.uuid().safeParse(websiteId).success)return json({error:"Invalid website."},400);
 try{
  const result=await getDb().transaction(async tx=>{
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
    const [legacy]=await tx.select({library:websiteContentLibraries.library}).from(websiteContentLibraries)
     .where(and(eq(websiteContentLibraries.organizationId,org.id),eq(websiteContentLibraries.websiteId,site.id))).limit(1);
    if(!legacy)return {imported:0,unchanged:0,skipped:0,issues:[],sourceAvailable:false};
    let raw:unknown;
    try{raw=JSON.parse(legacy.library);}catch{return {error:"The legacy content library is not valid JSON. Original data was preserved."};}
    const checked=contentLibrarySchema.safeParse(raw);
    if(!checked.success)return {error:"The legacy content library failed validation. Original data was preserved."};
    const existingRows=await tx.select({legacySourceId:websitePosts.legacySourceId,slug:websitePosts.slug})
     .from(websitePosts).where(and(eq(websitePosts.organizationId,org.id),eq(websitePosts.websiteId,site.id),eq(websitePosts.kind,"blog")));
    const importedIds=new Set(existingRows.map(row=>row.legacySourceId).filter((id):id is string=>Boolean(id)));
    const usedSlugs=new Set(existingRows.map(row=>row.slug));
    const issues:string[]=[];let imported=0,unchanged=0,skipped=0;
    for(const post of checked.data.posts){
     if(importedIds.has(post.id)){unchanged++;continue;}
     const title=post.title.trim().slice(0,150),body=post.body,excerpt=post.excerpt;
     if(!title || body.length>50000 || excerpt.length>320){skipped++;issues.push(post.id+": content exceeds article limits");continue;}
     const base=makeSlug(post.slug||title).slice(0,110);
     let slug=base,sequence=2;
     while(usedSlugs.has(slug)){slug=(base+"-"+sequence++).slice(0,120);}
     usedSlugs.add(slug);
     let featuredMediaId:string|null=null;
     if(post.featuredImageId){
      const asset=checked.data.assets.find(item=>item.id===post.featuredImageId);
      if(asset && !asset.source.startsWith("https://")){
       const [media]=await tx.select({id:websiteMedia.id}).from(websiteMedia).where(and(
        eq(websiteMedia.organizationId,org.id),eq(websiteMedia.websiteId,site.id),eq(websiteMedia.objectKey,asset.source),eq(websiteMedia.status,"ready")
       )).limit(1);
       featuredMediaId=media?.id??null;
      }
      if(!featuredMediaId)issues.push(post.id+": featured image retained in legacy library; no verified matching website media object was found");
     }
     const [created]=await tx.insert(websitePosts).values({
      organizationId:org.id,websiteId:site.id,authorUserId:user.id,legacySourceId:post.id,
      kind:"blog",title,slug,excerpt,body,category:"",tags:post.tags,seoTitle:null,seoDescription:null,
      featuredMediaId,status:"draft",revision:1,
     }).returning({id:websitePosts.id});
     await tx.insert(websitePostRevisions).values({organizationId:org.id,websiteId:site.id,postId:created.id,
      actorUserId:user.id,revision:1,event:"legacy_import",snapshot:{sourceId:post.id,legacyStatus:post.status,slug:post.slug,featuredImageId:post.featuredImageId}});
     imported++;
    }
    return {imported,unchanged,skipped,issues,sourceAvailable:true,originalPreserved:true};
   }
   return null;
  });
  if(!result)return json({error:"Website unavailable or editing denied."},404);
  if("error" in result)return json({error:result.error},422);
  return json(result);
 }catch{return json({error:"Legacy import failed. The original content library remains unchanged; retry safely."},503);}
}
