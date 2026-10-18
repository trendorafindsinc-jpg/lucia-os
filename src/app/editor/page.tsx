import type { Metadata } from "next";
import { VisualSiteEditor } from "@/components/editor/visual-site-editor";
import "./editor.css";

export const metadata: Metadata = {
  title: "Visual website editor",
  description: "Customise your website concept with a live visual preview.",
};

export default function VisualEditorPage() {
  return <VisualSiteEditor />;
}
