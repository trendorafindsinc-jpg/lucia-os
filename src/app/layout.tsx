import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./loom-renderer.css";
import { WorkspaceTabShell } from "@/components/workspace/workspace-tab-shell";

export const metadata: Metadata = {
  title: {
    default: "LUCIA OS",
    template: "%s | LUCIA OS"
  },
  description: "Build and manage your organisation's digital presence with LUCIA OS.",
  applicationName: "LUCIA OS"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f7fb"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body><WorkspaceTabShell>{children}</WorkspaceTabShell></body>
    </html>
  );
}
