import type { Metadata } from "next";
import { LoomGroupDetail } from "@/components/loom/loom-group-detail";
import "./../../loom.css";

export const metadata: Metadata = { title: "Loom group discussions", description: "Share ideas and discuss business challenges with your Loom group." };

export default async function LoomGroupDetailPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  return <LoomGroupDetail groupId={groupId} />;
}
