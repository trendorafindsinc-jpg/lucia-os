import type { Metadata } from "next";
import { SiteStructureEditor } from "@/components/site-structure/site-structure-editor";
import "./pages.css";

export const metadata: Metadata = {
  title: "Pages and navigation",
  description: "Organise website pages, navigation and reusable content sections.",
};

export default function SitePagesPage() {
  return <SiteStructureEditor />;
}
