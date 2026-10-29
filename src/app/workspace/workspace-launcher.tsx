import React from "react";
import Link from "next/link";
import type { WorkspaceApp } from "@/lib/workspace/app-registry";
import { WORKSPACE_APPS, WORKSPACE_TOOLS } from "@/lib/workspace/app-registry";
import styles from "./workspace-launcher.module.css";
import { OpenAppLibraryButton } from "./open-app-library-button";
import MobileExperience from "./mobile-experience";
import { WorkspaceIcon } from "@/components/workspace/workspace-icon";

type WorkspaceLauncherProps = {
  userId: string;
  displayName: string;
  organizationCount: number;
  websiteCount: number;
};


function AppTile({ app }: { app: WorkspaceApp }) {
  const icon = <span className={`${styles.iconSurface} ${styles[`icon_${app.icon}`]}`}><WorkspaceIcon icon={app.icon} /></span>;

  if (app.status === "available" && app.href) {
    return (
      <Link className={styles.appTile} href={app.href} aria-label={app.label}>
        {icon}
        <span className={styles.appLabel}>{app.label}</span>
        <span className={styles.appDescription}>{app.description}</span><span className={styles.appChevron} aria-hidden="true">›</span>
      </Link>
    );
  }

  return (
    <div className={`${styles.appTile} ${styles.appTileUnavailable}`} aria-disabled="true" title={app.reason}>
      {icon}
      <span className={styles.appLabel}>{app.label}<span className={styles.unavailableTag}>Unavailable</span></span>
      <span className={styles.appDescription}>{app.reason}</span>
    </div>
  );
}

export default function WorkspaceLauncher({ userId, displayName, organizationCount, websiteCount }: WorkspaceLauncherProps) {
  const firstName = displayName.trim().split(/\s+/)[0] || "there";

  return (
    <main className={`${styles.workspace} lucia-workspace-theme`}>
      <div data-lucia-launcher-background>
      <header className={styles.header}>
        <Link className={styles.brand} href="/workspace" aria-label="LUCIA OS workspace home">
          <span className={styles.brandMark} aria-hidden="true"><span /></span>
          <span>LUCIA <span className={styles.brandMuted}>OS</span></span>
        </Link>
        <div className={styles.headerActions}>
          <span className={styles.headerContext}>Your workspace</span>
          <span className={styles.avatar} aria-label={`Signed in as ${displayName || "user"}`}>{(displayName || "U").slice(0, 1).toUpperCase()}</span>
        </div>
      </header>

      <div className={styles.content}>
        <section className={styles.welcome} aria-labelledby="workspace-title">
          <p className={styles.eyebrow}>YOUR DIGITAL WORKSPACE</p><p className={styles.mobileGreeting}>Good to see you,</p>
          <h1 id="workspace-title"><span className={styles.desktopGreeting}>Welcome back, </span>{firstName}.</h1>
          <p className={styles.lead}>Build, create and manage your digital space with LUCIA OS.</p><div className={styles.mobileSearch}><span aria-hidden="true">⌕</span><span>Explore your apps below</span></div>
          <div className={styles.summary} aria-label="Workspace summary">
            <span><strong>{organizationCount}</strong> {organizationCount === 1 ? "organisation" : "organisations"}</span>
            <span className={styles.summaryDivider} aria-hidden="true" />
            <span><strong>{websiteCount}</strong> {websiteCount === 1 ? "website" : "websites"}</span>
          </div>
          <div className={styles.mobileStats} aria-label="Workspace at a glance">
            <Link href="/workspace" className={styles.mobileStat}><span aria-hidden="true"><WorkspaceIcon icon="organizations" /></span><strong>{organizationCount}</strong><small>Orgs</small></Link>
            <Link href="/workspace/websites" className={styles.mobileStat}><span aria-hidden="true"><WorkspaceIcon icon="domains" /></span><strong>{websiteCount}</strong><small>Websites</small></Link>
            <OpenAppLibraryButton className={styles.mobileStat}><span aria-hidden="true"><WorkspaceIcon icon="overview" /></span><strong>{WORKSPACE_APPS.filter((app) => app.status === "available").length}</strong><small>Apps</small></OpenAppLibraryButton>
            <Link href="/workspace/domains" className={styles.mobileStat}><span aria-hidden="true"><WorkspaceIcon icon="domains" /></span><strong>↗</strong><small>Domains</small></Link>
          </div>
        </section>

        <section className={styles.appSection} aria-labelledby="apps-title">
          <div className={styles.sectionHeading}>
            <div><h2 id="apps-title">Your apps</h2><p>Choose where you want to work.</p></div>
            <span className={styles.sectionCount}>{WORKSPACE_APPS.filter((app) => app.status === "available").length} available</span>
          </div>
          <div className={styles.appGrid}>{WORKSPACE_APPS.map((app) => <AppTile app={app} key={app.key} />)}</div>
        </section>

        <section className={styles.toolsSection} aria-labelledby="tools-title">
          <div className={styles.sectionHeading}><div><h2 id="tools-title">Workspace tools</h2><p>Manage the details behind your work.</p></div></div>
          <nav className={styles.toolsGrid} aria-label="Workspace tools">
            {WORKSPACE_TOOLS.map((tool) => <Link href={tool.href} className={styles.toolLink} key={tool.key}>{tool.label}<span aria-hidden="true">↗</span></Link>)}
          </nav>
        </section>
        <p className={styles.footerNote}>Your access is checked by LUCIA OS. Unavailable apps are shown for clarity and cannot be launched.</p>
      </div>
      </div>
      <MobileExperience key={userId} userId={userId} />
    </main>
  );
}
