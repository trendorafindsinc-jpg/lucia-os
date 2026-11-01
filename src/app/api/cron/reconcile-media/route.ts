import { timingSafeEqual } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { mediaStorage } from "@/lib/media/storage";
import { multipartStorage } from "@/lib/media/multipart-storage";
export const runtime="nodejs";export const dynamic="force-dynamic";export const maxDuration=60;
function authorized(request:Request){const expected=process.env.CRON_SECRET;const supplied=request.headers.get("authorization")?.replace(/^Bearer\\s+/i,"")??"";if(!expected||!supplied)return false;const a=Buffer.from(expected),b=Buffer.from(supplied);return a.length===b.length&&timingSafeEqual(a,b);}
export async function GET(request:Request){
 if(!authorized(request))return Response.json({error:"Unauthorized."},{status:401,headers:{"Cache-Control":"no-store"}});
 let recovered=0,removed=0,failed=0,orphaned=0;
 try{
  const db=getDb();const rows=await db.execute(sql`select * from lucia_claim_stale_media_uploads(50)`);
  for(const row of rows as unknown as {id:string;object_key:string;upload_id:string|null;bytes:number;mime:string;checksum:string|null;kind:string;width:number;height:number}[]){
   try{
    if(row.kind==="image"){
     const data=await mediaStorage().get(row.object_key);
     if(data.length===row.bytes){await db.execute(sql`select lucia_finalize_media_upload(${row.id}::uuid,'ready',null)`);recovered++;}
     else{await mediaStorage().remove(row.object_key);await db.execute(sql`select lucia_finalize_media_upload(${row.id}::uuid,'deleted',null)`);removed++;}
    }else{
     const head=await multipartStorage.head(row.object_key);
     if(head&&head.bytes===row.bytes&&head.mime===row.mime&&head.checksum===row.checksum&&head.etag){await db.execute(sql`select lucia_finalize_media_upload(${row.id}::uuid,'ready',${head.etag})`);recovered++;}
     else{if(row.upload_id)await multipartStorage.abort(row.object_key,row.upload_id);if(head)await multipartStorage.remove(row.object_key);await db.execute(sql`select lucia_finalize_media_upload(${row.id}::uuid,'deleted',null)`);removed++;}
    }
   }catch{failed++;}
  }
  const uploads=await multipartStorage.listIncomplete("os/",1000);const cutoff=Date.now()-7*86400000;
  for(const upload of uploads){if(upload.initiated<cutoff){try{await multipartStorage.abort(upload.key,upload.uploadId);orphaned++;}catch{failed++;}}}
  return Response.json({ok:failed===0,recovered,removed,orphaned,failed},{headers:{"Cache-Control":"no-store"}});
 }catch{return Response.json({error:"Media reconciliation is temporarily unavailable. Pending reservations remain intact."},{status:503,headers:{"Cache-Control":"no-store"}});}
}
