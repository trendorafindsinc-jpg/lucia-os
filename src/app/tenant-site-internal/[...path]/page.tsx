import {
  PublicWebsite,
  publicWebsiteMetadata,
} from "@/lib/domains/public-site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PublicWebsitePath({
  params,
  searchParams,
}: {
  params: Promise<{ path: string[] }>;
  searchParams: Promise<Record<string,string|string[]|undefined>>;
}) {
  const [{path},query] = await Promise.all([params,searchParams]);
  return <PublicWebsite path={path.join("/")} searchParams={query} />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path } = await params;
  return publicWebsiteMetadata(path.join("/"));
}
