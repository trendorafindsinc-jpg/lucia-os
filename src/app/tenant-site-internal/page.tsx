import {
  PublicWebsite,
  publicWebsiteMetadata,
} from "@/lib/domains/public-site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function PublicWebsiteRoot() {
  return <PublicWebsite path="/" />;
}

export async function generateMetadata() {
  return publicWebsiteMetadata("/");
}
