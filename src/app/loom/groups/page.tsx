import type { Metadata } from "next";
import { LoomGroups } from "@/components/loom/loom-groups";
import "./../loom.css";

export const metadata: Metadata = { title: "Loom groups", description: "Discover and create focused LUCIA Loom community groups." };

export default function LoomGroupsPage() {
  return <LoomGroups />;
}
