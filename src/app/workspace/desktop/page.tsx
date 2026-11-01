import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { DesktopWorkspace } from "@/components/workspace/desktop-workspace";
import { describeDesktopApp } from "@/lib/workspace/desktop";
import "../../editor/editor.css";
import "../../templates/templates.css";

export const metadata = { title: "Lattice" };
export const dynamic = "force-dynamic";

export default async function DesktopWorkspacePage({ searchParams }: { searchParams: Promise<{ app?: string | string[] }> }) {
  const user = await getCurrentUser();
  if (!user) return <main className="workspace-shell"><section className="workspace-card workspace-denied"><h1>Sign in to open Lattice.</h1><p>Your apps keep their normal website access and save checks.</p><Link href="/api/auth/login?returnTo=%2Fworkspace">Sign in with LUCIA ID</Link></section></main>;
  const params = await searchParams;
  const requested = typeof params.app === "string" ? params.app : undefined;
  const initialHref = requested && describeDesktopApp(requested) ? requested : undefined;
  return <DesktopWorkspace key={user.id} userId={user.id} initialHref={initialHref} />;
}
