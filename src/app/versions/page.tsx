import type { Metadata } from "next";
import { VersionWorkspace } from "@/components/versions/version-workspace";
import "./versions.css";

export const metadata: Metadata = {
  title: "Drafts, Preview & Rollback | LUCIA OS",
  description: "Create draft checkpoints, preview versions and safely restore an earlier website draft.",
};

export default function VersionsPage() {
  return <VersionWorkspace />;
}
