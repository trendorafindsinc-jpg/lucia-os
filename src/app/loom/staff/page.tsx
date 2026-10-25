import type { Metadata } from "next";
import { LoomStaff } from "@/components/loom/loom-staff";
import "./../loom.css";

export const metadata: Metadata = { title: "Loom staff review", description: "Authorised Loom business verification and moderation review." };

export default function LoomStaffPage() {
  return <LoomStaff />;
}
