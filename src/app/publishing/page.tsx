import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { PublishingStudioWorkspace } from "@/components/publishing/publishing-studio-workspace";
import "./publishing.css";

export const metadata: Metadata = {
  title: "Publishing Studio | LUCIA OS",
  description: "Manage Blog and News publishing for your website.",
};
export const dynamic = "force-dynamic";

export default async function PublishingStudioPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/login?returnTo=%2Fworkspace%2Fwebsites");
  return <Suspense fallback={<main className="publishing-shell"><p role="status">Opening Publishing Studio…</p></main>}>
    <PublishingStudioWorkspace accountId={user.id} />
  </Suspense>;
}
