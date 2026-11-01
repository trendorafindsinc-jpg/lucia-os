import { headers } from "next/headers";
import { resolveLuciaSubdomain } from "@/lib/publishing/host";
import { readPublishedContentContract } from "@/lib/content/public-articles";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){
 try{const host=(await headers()).get("host");const slug=resolveLuciaSubdomain(host,process.env.LUCIA_SITE_DOMAIN||"lucia.name.ng");return Response.json(await readPublishedContentContract(slug??undefined),{headers:{"Cache-Control":"public, s-maxage=60, stale-while-revalidate=300","Vary":"Host"}});}
 catch{return Response.json({error:"Published content is unavailable for this website."},{status:404,headers:{"Cache-Control":"no-store"}});}
}
