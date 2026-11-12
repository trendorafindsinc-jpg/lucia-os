import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { WORKSPACE_APPS } from "@/lib/workspace/app-registry";
import { WorkspaceIcon } from "@/components/workspace/workspace-icon";
import styles from "../settings/settings.module.css";
export const metadata = { title: "App Library" };
export default async function AppLibraryPage() {
  const user = await getCurrentUser();
  if (!user)
    return (
      <main className="workspace-shell">
        <h1>Sign in to open your App Library.</h1>
        <Link href="/api/auth/login?returnTo=%2Fworkspace">
          Sign in with LUCIA ID
        </Link>
      </main>
    );
  return (
    <main className={`${styles.center} lucia-workspace-theme`}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>LUCIA OS</p>
          <h1>App Library</h1>
          <p>All available apps, including those hidden from Home.</p>
        </div>
        <Link href="/workspace">Back to workspace</Link>
      </header>
      <section
        className={styles.library}
        aria-label="All workspace applications"
      >
        {WORKSPACE_APPS.map((app) => (
          <article key={app.id}>
            <WorkspaceIcon icon={app.icon} />
            <h2>{app.label}</h2>
            <p>{app.description}</p>
            {app.status === "available" && app.href ? (
              <Link href={app.href} aria-label={`Open ${app.label}`}>
                Open app →
              </Link>
            ) : (
              <p aria-disabled="true">{app.reason}</p>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
