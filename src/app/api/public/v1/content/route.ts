import { readPublishedContentContract } from "@/lib/content/public-articles";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){
 try{return Response.json(await readPublishedContentContract(),{headers:{"Cache-Control":"public, s-maxage=60, stale-while-revalidate=300","Vary":"Host"}});}
 catch{return Response.json({error:"Published content is unavailable for this website."},{status:404,headers:{"Cache-Control":"no-store"}});}
}
