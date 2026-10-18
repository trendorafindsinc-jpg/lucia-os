import type { Metadata } from "next";
import { WebsiteSetupWizard } from "@/components/onboarding/website-setup-wizard";
import "./create.css";

export const metadata: Metadata = {
  title: "Create your website",
  description: "Plan your organisation website with a guided, beginner-friendly setup.",
};

export default function CreateWebsitePage() {
  return <WebsiteSetupWizard />;
}
