import type { Metadata } from "next";
import { LoomNotifications } from "@/components/loom/loom-notifications";
import "./../loom.css";

export const metadata: Metadata = { title: "Loom notifications", description: "Keep up with your LUCIA Loom community activity." };

export default function LoomNotificationsPage() {
  return <LoomNotifications />;
}
