import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { LuciaStudioNodeCanvas } from "@/components/lucia-studio/node-canvas";

export const metadata = {
  title: "Lucia Studio",
  description: "Organize and inspect your website graph in Lucia Studio.",
};
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ websiteId?: string; organizationId?: string }>;

export default async function LuciaStudioPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/login?returnTo=%2Fworkspace%2Fwebsites");
  const params = await searchParams;
  const websiteId = params.websiteId ?? "";
  const organizationId = params.organizationId ?? "";
  if (!z.uuid().safeParse(websiteId).success || !z.uuid().safeParse(organizationId).success) {
    return <main style={{ minHeight: "60vh", display: "grid", placeContent: "center", padding: 32 }}>
      <h1>Choose a website to open Lucia Studio</h1>
      <p>Open Studio from your website library so the correct workspace can be verified.</p>
      <a href="/workspace/websites">Go to your websites</a>
    </main>;
  }
  return <LuciaStudioNodeCanvas websiteId={websiteId} organizationId={organizationId} />;
}
