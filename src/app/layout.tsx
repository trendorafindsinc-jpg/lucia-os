import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "@/styles/phase-3-blue-glass.css";
import "./layout-renderer.css";
import "./premium-meridian.css";
import { getPlatformHostnames } from "@/lib/publishing/platform-hosts";
import { WorkspaceTabShell } from "@/components/workspace/workspace-tab-shell";

export const metadata: Metadata = {
  title: {
    default: "LUCIA OS",
    template: "%s | LUCIA OS",
  },
  description:
    "Build and manage your organisation's digital presence with LUCIA OS.",
  applicationName: "LUCIA OS",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f7fb",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <WorkspaceTabShell
          platformHosts={[...getPlatformHostnames(), "localhost", "127.0.0.1"]}
        >
          {children}
        </WorkspaceTabShell>
      </body>
    </html>
  );
}
