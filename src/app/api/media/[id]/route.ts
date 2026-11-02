import { getCurrentUser } from "@/lib/auth/session";
import { findReadableMedia } from "@/lib/media/service";
import { mediaStorage } from "@/lib/media/storage";
import { multipartStorage } from "@/lib/media/multipart-storage";
import { safeOriginalFilename } from "@/lib/media/asset-model";
import { isPlatformHostname } from "@/lib/publishing/platform-hosts";
import { z } from "zod";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(request:Request,context:{params:Promise<{id:string}>}){
 const {id}=await context.params;if(!z.uuid().safeParse(id).success)return new Response("Not found",{status:404});
 try{
  const hostname=(request.headers.get("host")||new URL(request.url).hostname).trim().toLowerCase().replace(/:\\d+$/,"").replace(/\\.$/,"");
  const user=isPlatformHostname(hostname)?await getCurrentUser().catch(()=>null):null;
  const row=await findReadableMedia(id,user?.id??null);if(!row)return new Response("Not found",{status:404,headers:{"Cache-Control":"no-store"}});
  const cache=row.public?"public,max-age=300":"private,no-store";
  if(row.kind==="image"){
   const bytes=await mediaStorage().get(row.object_key);if(bytes.length!==row.bytes)throw Error("Stored image mismatch");
   return new Response(new Uint8Array(bytes),{headers:{"Content-Type":"image/webp","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; sandbox","Cache-Control":cache}});
  }
  const stored=await multipartStorage.stream(row.object_key,request.headers.get("range")??undefined);
  if(!stored)return new Response("Not found",{status:404,headers:{"Cache-Control":"no-store"}});
  const headers=new Headers({"Content-Type":row.mime,"X-Content-Type-Options":"nosniff","Cache-Control":cache,"Accept-Ranges":"bytes"});
  const length=stored.headers.get("content-length");if(length)headers.set("Content-Length",length);
  const contentRange=stored.headers.get("content-range");if(contentRange)headers.set("Content-Range",contentRange);
  const etag=row.etag||stored.headers.get("etag");if(etag)headers.set("ETag",etag);
  if(row.kind==="document"){
   const filename=safeOriginalFilename(row.original_name||"document.pdf");
   headers.set("Content-Disposition","attachment; filename=\"document.pdf\"; filename*=UTF-8''"+encodeURIComponent(filename));
   headers.set("Content-Security-Policy","default-src 'none'; sandbox");
  }else headers.set("Content-Disposition","inline");
  return new Response(stored.body,{status:stored.status,headers});
 }catch{return new Response("Media temporarily unavailable",{status:503,headers:{"Cache-Control":"no-store"}});}
}
