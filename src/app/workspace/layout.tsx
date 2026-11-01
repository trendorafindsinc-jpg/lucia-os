import { PreferenceBoundary } from "@/components/workspace/preference-boundary";
import "@/styles/workspace-preferences.css";
export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PreferenceBoundary>{children}</PreferenceBoundary>;
}
