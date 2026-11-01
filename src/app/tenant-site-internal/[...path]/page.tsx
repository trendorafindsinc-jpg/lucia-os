import {
  PublicWebsite,
  publicWebsiteMetadata,
} from "@/lib/domains/public-site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PublicWebsitePath({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path } = await params;
  return <PublicWebsite path={path.join("/")} />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path } = await params;
  return publicWebsiteMetadata(path.join("/"));
}
