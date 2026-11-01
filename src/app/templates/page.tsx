import type { Metadata } from "next";
import { TemplateGallery } from "@/components/templates/template-gallery";
import "./templates.css";

export const metadata: Metadata = {
  title: "Layouts | LUCIA OS",
  description: "Browse website layouts for businesses, schools, creators, shops and communities."
};

export default function TemplatesPage() {
  return <TemplateGallery />;
}
