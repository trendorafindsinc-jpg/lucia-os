import type { Metadata } from "next";
import { FormsWorkspace } from "@/components/forms/forms-workspace";
import "./forms.css";

export const metadata: Metadata = {
  title: "Forms & Enquiries | LUCIA OS",
  description: "Create a contact form, review demo submissions, and configure notification preferences.",
};

export default function FormsPage() {
  return <FormsWorkspace />;
}
