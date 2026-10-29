import type { Metadata } from "next";
import { LoomDiscover } from "@/components/loom/loom-discover";
import "./../loom.css";

export const metadata: Metadata = { title: "Discover Loom", description: "Discover verified businesses and connect with the LUCIA community." };

export default function LoomDiscoverPage() {
  return <LoomDiscover />;
}
