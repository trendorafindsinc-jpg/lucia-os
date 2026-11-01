import { notFound } from "next/navigation";
import { LayoutRenderer } from "@/components/layout-studio/layout-renderer";
import { premiumCandidate } from "@/lib/layout-blueprint/premium-layouts/catalogue-candidates";
import { isPremiumStartingLayout } from "@/lib/templates/starting-layouts";

export const metadata = { title: "Layout preview", robots: { index: false, follow: false } };
export default async function PremiumLayoutThumbnail({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isPremiumStartingLayout(id)) notFound();
  return <LayoutRenderer blueprint={premiumCandidate(id)} pagePath="/" preview idPrefix="thumbnail-" />;
}
