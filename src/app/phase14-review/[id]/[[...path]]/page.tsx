import { notFound } from "next/navigation";
import {
  premiumCandidate,
  premiumCandidateIds,
} from "@/lib/layout-blueprint/premium-layouts/catalogue-candidates";
import { CandidateReviewSurface } from "./review-surface";

/** Development-only deterministic browser evidence surface.
 * The actual customer preview / public rendering still uses the SAME
 * LayoutRenderer; no project/customer data or alternative engine is created.
 * Production and preview deployments must always return 404 here.
 */
export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{ id: string; path?: string[] }>;
};
export default async function Phase14ReviewRoute({ params }: RouteProps) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { id, path = [] } = await params;
  const canonical = "lucia.layout." + id;
  if (!premiumCandidateIds.includes(canonical)) notFound();
  const requestedPath = path.length ? "/" + path.join("/") : "/";
  const candidate = premiumCandidate(canonical);
  if (!candidate.pages.some((page) => page.path === requestedPath)) notFound();
  return (
    <CandidateReviewSurface
      blueprint={candidate}
      id={id}
      pagePath={requestedPath}
    />
  );
}
