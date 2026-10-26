import type { Metadata } from "next";
import { LoomBlocks } from "@/components/loom/loom-blocks";
import "./../loom.css";

export const metadata: Metadata = { title: "Blocked members — Loom", description: "Manage blocked member relationships in LUCIA Loom." };

export default function LoomBlocksPage() {
  return <LoomBlocks />;
}
