import { timingSafeEqual } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
export const runtime="nodejs";
export const dynamic="force-dynamic";
function authorized(request:Request){
 const expected=process.env.CRON_SECRET;
 const supplied=request.headers.get("authorization")?.replace(/^Bearer\\s+/i,"") ?? "";
 if(!expected || !supplied)return false;
 const a=Buffer.from(expected),b=Buffer.from(supplied);
 return a.length===b.length && timingSafeEqual(a,b);
}
export async function GET(request:Request){
 if(!authorized(request))return Response.json({error:"Unauthorized."},{status:401,headers:{"Cache-Control":"no-store"}});
 try{
  const [result]=await getDb().execute(sql`select lucia_publish_due_articles(25) as published`);
  return Response.json({ok:true,published:Number(result?.published ?? 0)},{headers:{"Cache-Control":"no-store"}});
 }catch{
  return Response.json({error:"Scheduled publication could not be completed. Due articles remain queued for retry."},{status:503,headers:{"Cache-Control":"no-store"}});
 }
}
