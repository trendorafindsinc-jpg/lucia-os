import type { Metadata } from "next";
import { LoomMemberProfile } from "@/components/loom/loom-member-profile";
import "./../../loom.css";

export const metadata: Metadata = { title: "Loom member profile", description: "View a verified business profile in LUCIA Loom." };

export default async function LoomMemberProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  return <LoomMemberProfile userId={userId} />;
}
