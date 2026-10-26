import type { Metadata } from "next";
import { LoomProfile } from "@/components/loom/loom-profile";
import "./../loom.css";

export const metadata: Metadata = { title: "Your Loom profile", description: "Manage your LUCIA Loom community profile." };

export default function LoomProfilePage() {
  return <LoomProfile />;
}
