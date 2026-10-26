import type { Metadata } from "next";
import { LoomSaved } from "@/components/loom/loom-saved";
import "./../loom.css";

export const metadata: Metadata = { title: "Saved Loom posts", description: "Revisit the public Loom posts you saved." };

export default function LoomSavedPage() {
  return <LoomSaved />;
}
