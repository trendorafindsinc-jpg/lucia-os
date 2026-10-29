import type { Metadata } from "next";
import { LoomCommunity } from "@/components/loom/loom-community";
import "./loom.css";
export const metadata: Metadata = { title: "Loom community", description: "Share ideas, ask questions and learn with the LUCIA community." };
export default function LoomPage() { return <LoomCommunity />; }
