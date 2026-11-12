import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrganizationMembershipsForUser } from "@/lib/access/guards";
import ControlCenter from "./control-center";
export const metadata = { title: "Control Center" };
export const dynamic = "force-dynamic";
export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user)
    return (
      <main className="workspace-shell">
        <h1>Sign in to open Settings.</h1>
        <Link href="/api/auth/login?returnTo=%2Fworkspace%2Fsettings">
          Sign in with LUCIA ID
        </Link>
      </main>
    );
  const memberships = await getOrganizationMembershipsForUser(user.id);
  return (
    <ControlCenter
      user={{ displayName: user.displayName || "LUCIA user" }}
      organizations={memberships.map((o) => ({
        id: o.id,
        name: o.name,
        role: o.role,
      }))}
    />
  );
}
