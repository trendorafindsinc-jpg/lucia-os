import type { Metadata } from "next";
import { PublishingWorkspace } from "@/components/publishing/publishing-workspace";
import "./publish.css";

export const metadata: Metadata = {
  title: "Publishing & Domains | LUCIA OS",
  description: "Review website publishing requirements, public address settings and custom-domain readiness.",
};

export default function PublishPage() {
  return <PublishingWorkspace />;
}
