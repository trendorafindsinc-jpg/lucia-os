import type { Metadata } from "next";
import { TemplateGallery } from "@/components/templates/template-gallery";
import "./templates.css";

export const metadata: Metadata = {
  title: "Website template catalogue",
  description: "Explore 36 website design concepts for businesses, schools, creators, shops and communities."
};

export default function TemplatesPage() {
  return <TemplateGallery />;
}
