import type { Metadata } from "next";
import { LoomMessages } from "@/components/loom/loom-messages";
import "./../loom.css";

export const metadata: Metadata = { title: "Loom messages", description: "Private conversations with accepted LUCIA Loom connections." };

export default function LoomMessagesPage() {
  return <LoomMessages />;
}
