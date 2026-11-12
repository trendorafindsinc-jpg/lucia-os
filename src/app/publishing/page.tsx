import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata, Route } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { PublishingStudioWorkspace } from "@/components/publishing/publishing-studio-workspace";
import "./publishing.css";

export const metadata: Metadata = {
  title: "Publishing Studio | LUCIA OS",
  description: "Manage Blog and News publishing for your website.",
};
export const dynamic = "force-dynamic";

export default async function PublishingStudioPage({ searchParams }: { searchParams: Promise<{ websiteId?: string | string[] }> }) {
  const params = await searchParams;
  const websiteId = typeof params.websiteId === "string" ? params.websiteId : "";
  const returnTo = websiteId ? "/publishing?websiteId=" + encodeURIComponent(websiteId) : "/workspace/websites";
  const user = await getCurrentUser();
  if (!user) redirect(("/api/auth/login?returnTo=" + encodeURIComponent(returnTo)) as Route);
  return <Suspense fallback={<main className="publishing-shell"><p role="status">Opening Publishing Studio…</p></main>}>
    <PublishingStudioWorkspace accountId={user.id} />
  </Suspense>;
}
