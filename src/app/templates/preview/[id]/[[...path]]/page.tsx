import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { premiumCandidate } from "@/lib/layout-blueprint/premium-layouts/catalogue-candidates";
import { isPremiumStartingLayout } from "@/lib/templates/starting-layouts";
import { LayoutPreview } from "./preview";
export const dynamic = "force-dynamic";
export default async function PreviewPage({ params }: { params: Promise<{ id: string; path?: string[] }> }) {
  const { id, path = [] } = await params;
  if (!isPremiumStartingLayout(id)) notFound();
  const blueprint = premiumCandidate(id);
  const pagePath = path.length ? "/" + path.join("/") : "/";
  if (!blueprint.pages.some((page) => page.path === pagePath)) notFound();
  if (!await getCurrentUser()) redirect(("/api/auth/login?returnTo=" + encodeURIComponent("/templates/preview/" + id + (pagePath === "/" ? "" : pagePath))) as Route);
  return <LayoutPreview blueprint={blueprint} pagePath={pagePath} />;
}
