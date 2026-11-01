import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { websiteMedia, websiteMediaLimits } from "@/lib/db/schema";
import { MediaError, boundedQuota, uploadsEnabled, withMediaWebsite } from "@/lib/media/service";
import { mediaAssetAbortSchema, mediaAssetCompleteSchema, mediaAssetCreateSchema, mediaExtension, safeOriginalFilename, validMediaMagic, validateMediaParts } from "@/lib/media/asset-model";
import { MULTIPART_PART_BYTES, multipartStorage } from "@/lib/media/multipart-storage";
import { websiteMutationAllowed } from "@/lib/websites/draft-revision";
export const runtime="nodejs";export const dynamic="force-dynamic";
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"private,no-store"}});
type Context={params:Promise<{websiteId:string}>};
export async function POST(request:Request,context:Context){
 const user=await getCurrentUser();if(!user)return json({error:"Sign in with LUCIA ID."},401);
 if(!websiteMutationAllowed(request))return json({error:"Request origin denied."},403);
 if(request.headers.get("x-lucia-workspace-account")&&request.headers.get("x-lucia-workspace-account")!==user.id)return json({error:"Account changed. Reload Studio."},409);
 const {websiteId}=await context.params;if(!z.uuid().safeParse(websiteId).success)return json({error:"Invalid website."},400);
 let raw:unknown;try{raw=await request.json();}catch{return json({error:"Invalid upload request."},400);}
 const action=(raw as {action?:unknown})?.action;
 try{
  if(action==="create"){
   const parsed=mediaAssetCreateSchema.safeParse(raw);if(!parsed.success)return json({error:"Check the file type, size, description and checksum."},422);
   if(!uploadsEnabled())return json({error:"Customer media uploads are not enabled for this environment."},503);
   const input=parsed.data,extension=mediaExtension(input.mime);if(!extension||!input.filename.toLowerCase().endsWith("."+extension))return json({error:"The filename extension must match the supported media type."},422);
   const header=Buffer.from(input.headerBase64,"base64");if(header.length>64||!validMediaMagic(input.kind,input.mime,header))return json({error:"The file signature does not match the selected media type."},415);
   const id=crypto.randomUUID(),filename=safeOriginalFilename(input.filename);
   const reservation=await withMediaWebsite(user.id,websiteId,"website.edit",async(tx,organizationId)=>{
    const [rate]=await tx.execute(sql`select count(*)::int as count from website_media where website_id=${websiteId} and created_at>now()-interval '1 minute'`);
    if(Number(rate?.count??0)>=10)throw new MediaError("Wait a minute before uploading more media.",429);
    const [usage]=await tx.execute(sql`select coalesce(sum(bytes),0)::bigint as used,count(*)::int as count from website_media where website_id=${websiteId} and kind=${input.kind} and status<>'deleted'`);
    const [limits]=await tx.select({videoQuotaBytes:websiteMediaLimits.videoQuotaBytes,documentQuotaBytes:websiteMediaLimits.documentQuotaBytes}).from(websiteMediaLimits).where(eq(websiteMediaLimits.websiteId,websiteId)).limit(1);
    const quota=input.kind==="video"?Number(limits?.videoQuotaBytes??boundedQuota(process.env.MEDIA_VIDEO_WEBSITE_QUOTA_BYTES,500_000_000)):Number(limits?.documentQuotaBytes??boundedQuota(process.env.MEDIA_DOCUMENT_WEBSITE_QUOTA_BYTES,50_000_000));
    if(Number(usage?.count??0)>=(input.kind==="video"?20:100))throw new MediaError("This website has reached its "+input.kind+" asset limit.",413);
    if(Number(usage?.used??0)+input.bytes>quota)throw new MediaError("This website's "+input.kind+" storage quota is full.",413);
    await tx.execute(sql`select reserved_bytes from media_storage_budget where product='lucia-os' for update`);
    const budget=boundedQuota(process.env.MEDIA_PRODUCT_BUDGET_BYTES,2_000_000_000);
    const reserved=await tx.execute(sql`update media_storage_budget set reserved_bytes=reserved_bytes+${input.bytes} where product='lucia-os' and reserved_bytes+${input.bytes}<=${budget} returning product`);
    if(!reserved.length)throw new MediaError("Shared customer storage capacity is unavailable.",507);
    const objectKey="os/"+organizationId+"/"+websiteId+"/"+id+"."+extension;
    await tx.insert(websiteMedia).values({id,organizationId,websiteId,createdByUserId:user.id,objectKey,kind:input.kind,mime:input.mime,originalName:filename,checksum:input.sha256,caption:input.caption,durationMs:input.durationMs,bytes:input.bytes,width:0,height:0,alt:input.alt,status:"pending"});
    return {organizationId,objectKey};
   });
   let uploadId:string;
   try{uploadId=await multipartStorage.create(reservation.objectKey,input.mime,input.kind,input.sha256);}
   catch{return json({error:"Storage upload could not be started. Its reservation remains pending for safe reconciliation."},503);}
   try{
    await withMediaWebsite(user.id,websiteId,"website.edit",async tx=>{await tx.update(websiteMedia).set({uploadId,updatedAt:new Date()}).where(and(eq(websiteMedia.id,id),eq(websiteMedia.status,"pending")));});
    const partCount=Math.ceil(input.bytes/MULTIPART_PART_BYTES);
    const parts=Array.from({length:partCount},(_,index)=>({partNumber:index+1,url:multipartStorage.signPart(reservation.objectKey,uploadId,index+1)}));
    return json({mediaId:id,uploadId,partSize:MULTIPART_PART_BYTES,partCount,parts});
   }catch{
    try{await multipartStorage.abort(reservation.objectKey,uploadId);}catch{}
    return json({error:"Upload preparation failed. Refresh the media library before retrying."},503);
   }
  }
  if(action==="complete"){
   const parsed=mediaAssetCompleteSchema.safeParse(raw);if(!parsed.success)return json({error:"The multipart upload manifest is invalid."},422);
   const input=parsed.data;
   const record=await withMediaWebsite(user.id,websiteId,"website.edit",async tx=>{
    const [row]=await tx.select({id:websiteMedia.id,objectKey:websiteMedia.objectKey,bytes:websiteMedia.bytes,mime:websiteMedia.mime,checksum:websiteMedia.checksum,uploadId:websiteMedia.uploadId,status:websiteMedia.status,kind:websiteMedia.kind,alt:websiteMedia.alt}).from(websiteMedia).where(eq(websiteMedia.id,input.mediaId)).limit(1);return row;
   });
   if(!record)return json({error:"Upload not found."},404);
   if(record.status==="ready")return json({id:record.id,ref:"media:"+record.id,alreadyComplete:true});
   if(record.status!=="pending"||record.uploadId!==input.uploadId||!record.checksum)return json({error:"Upload session is not valid for this asset."},409);
   if(!validateMediaParts(input.parts,record.bytes,MULTIPART_PART_BYTES))return json({error:"Every uploaded part must be present exactly once and in order."},422);
   let head=await multipartStorage.head(record.objectKey);
   if(!head){await multipartStorage.complete(record.objectKey,input.uploadId,input.parts.map(p=>({partNumber:p.partNumber,etag:p.etag})));head=await multipartStorage.head(record.objectKey);}
   if(!head||head.bytes!==record.bytes||head.mime!==record.mime||head.checksum!==record.checksum||!head.etag)return json({error:"The stored object did not pass size, type and checksum metadata verification. Its reservation remains pending."},503);
   await withMediaWebsite(user.id,websiteId,"website.edit",async tx=>{
    const ready=await tx.update(websiteMedia).set({status:"ready",etag:head!.etag,uploadId:null,updatedAt:new Date()}).where(and(eq(websiteMedia.id,input.mediaId),eq(websiteMedia.status,"pending"),eq(websiteMedia.uploadId,input.uploadId))).returning({id:websiteMedia.id});
    if(!ready.length){const [current]=await tx.select({status:websiteMedia.status}).from(websiteMedia).where(eq(websiteMedia.id,input.mediaId)).limit(1);if(current?.status!=="ready")throw new MediaError("Upload finalization was not confirmed.",503);}
   });
   return json({id:record.id,ref:"media:"+record.id,kind:record.kind,mime:record.mime,bytes:record.bytes,alt:record.alt,etag:head.etag});
  }
  if(action==="abort"){
   const parsed=mediaAssetAbortSchema.safeParse(raw);if(!parsed.success)return json({error:"Invalid upload cancellation."},422);
   const input=parsed.data;
   const record=await withMediaWebsite(user.id,websiteId,"website.edit",async tx=>{const [row]=await tx.select({id:websiteMedia.id,objectKey:websiteMedia.objectKey,bytes:websiteMedia.bytes,uploadId:websiteMedia.uploadId,status:websiteMedia.status}).from(websiteMedia).where(eq(websiteMedia.id,input.mediaId)).limit(1);return row;});
   if(!record)return json({error:"Upload not found."},404);
   if(record.status==="deleted")return json({ok:true});
   if(record.status!=="pending"||record.uploadId!==input.uploadId)return json({error:"This upload can no longer be cancelled."},409);
   if(await multipartStorage.head(record.objectKey))return json({error:"The object is already complete; refresh the media library to finalize it."},409);
   await multipartStorage.abort(record.objectKey,input.uploadId);
   await withMediaWebsite(user.id,websiteId,"website.edit",async tx=>{
    const removed=await tx.update(websiteMedia).set({status:"deleted",uploadId:null,updatedAt:new Date()}).where(and(eq(websiteMedia.id,input.mediaId),eq(websiteMedia.status,"pending"),eq(websiteMedia.uploadId,input.uploadId))).returning({bytes:websiteMedia.bytes});
    if(removed.length)await tx.execute(sql`update media_storage_budget set reserved_bytes=greatest(0,reserved_bytes-${removed[0].bytes}) where product='lucia-os'`);
   });return json({ok:true});
  }
  return json({error:"Unknown upload action."},422);
 }catch(error){return json({error:error instanceof MediaError?error.message:"Customer media upload could not be completed. Pending reservations are retained for reconciliation."},error instanceof MediaError?error.status:503);}
}
