import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getStartingLayoutById as getTemplateById } from "@/lib/templates/starting-layouts";
import type { Metadata } from "next";
import { WebsiteSetupWizard } from "@/components/onboarding/website-setup-wizard";
import "./create.css";
import "./website-first.css";

export const metadata: Metadata = {
  title: "Create your website",
  description:
    "Plan your organisation website with a guided, beginner-friendly setup.",
};

export default async function CreateWebsitePage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    const params = await searchParams;
    const path =
      params.template && getTemplateById(params.template)
        ? `/create?template=${encodeURIComponent(params.template)}`
        : "/create";
    return (
      <main className="workspace-shell">
        <h1>Sign in to create your free website</h1>
        <p>Your website belongs to your authorized LUCIA workspace.</p>
        <Link href={`/api/auth/login?returnTo=${encodeURIComponent(path)}`}>
          Sign in with LUCIA ID
        </Link>
      </main>
    );
  }
  return <WebsiteSetupWizard key={user.id} userId={user.id} />;
}
