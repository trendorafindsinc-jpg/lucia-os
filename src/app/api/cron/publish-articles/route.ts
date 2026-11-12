import { isAuthorizedCronRequest } from "@/lib/cron/authorization";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(request:Request){if(!(await isAuthorizedCronRequest(request)))return Response.json({error:"Unauthorized."},{status:401,headers:{"Cache-Control":"no-store"}});try{const [row]=await getDb().execute(sql`select lucia_publish_due_articles(25) as published`);return Response.json({ok:true,published:Number(row?.published??0)},{headers:{"Cache-Control":"no-store"}});}catch(error){console.error("[cron:publish-articles] Scheduled publication failed",error);return Response.json({error:"Scheduled publication failed. Due articles remain queued for retry."},{status:503,headers:{"Cache-Control":"no-store"}});}}
