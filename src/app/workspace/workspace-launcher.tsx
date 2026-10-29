import React from "react";
import Link from "next/link";
import type { WorkspaceApp } from "@/lib/workspace/app-registry";
import { WORKSPACE_APPS, WORKSPACE_TOOLS } from "@/lib/workspace/app-registry";
import styles from "./workspace-launcher.module.css";
import MobileExperience from "./mobile-experience";
import { AssistiveOrb } from "@/components/workspace/assistive-orb";

type WorkspaceLauncherProps = {
  userId: string;
  displayName: string;
  organizationCount: number;
  websiteCount: number;
};

function AppGlyph({ icon }: { icon: WorkspaceApp["icon"] }) {
  const common = {
    "aria-hidden": true as const,
    viewBox: "0 0 32 32",
    fill: "none",
    className: styles.glyph,
  };

  switch (icon) {
    case "overview":
      return <svg {...common}><rect x="5" y="5" width="9" height="9" rx="3" /><rect x="18" y="5" width="9" height="9" rx="3" /><rect x="5" y="18" width="9" height="9" rx="3" /><path d="M22.5 18v9M18 22.5h9" strokeLinecap="round" /></svg>;
    case "website":
      return <svg {...common}><rect x="4" y="6" width="24" height="20" rx="5" /><path d="M4 12h24M9 9h.01M12 9h.01M10 18l4-4 4 4-4 4-4-4Z" strokeLinecap="round" strokeLinejoin="round" /><path d="M21 16h3M21 20h3" strokeLinecap="round" /></svg>;
    case "layouts":
      return <svg {...common}><rect x="5" y="7" width="17" height="17" rx="3" /><path d="M10 12h7M10 16h7M10 20h4M24 11h3v14a3 3 0 0 1-3 3H12v-2" strokeLinecap="round" /></svg>;
    case "loomify-ai":
      return <svg {...common}><path d="M16 4 19.3 12.7 28 16l-8.7 3.3L16 28l-3.3-8.7L4 16l8.7-3.3L16 4Z" strokeLinejoin="round" /><circle cx="16" cy="16" r="3.1" /><path d="M24 4v5M21.5 6.5h5" strokeLinecap="round" /></svg>;
    case "loom":
      return <svg {...common}><circle cx="9" cy="11" r="3.5" /><circle cx="23" cy="11" r="3.5" /><circle cx="16" cy="23" r="3.5" /><path d="m12 13 3 6m5-6-3 6M12.5 11h7" strokeLinecap="round" /></svg>;
    case "store":
      return <svg {...common}><path d="M6 12h20l-2 15H8L6 12Z" strokeLinejoin="round" /><path d="M11 12V9a5 5 0 0 1 10 0v3" strokeLinecap="round" /><path d="m12 19 3 3 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
}

function AppTile({ app }: { app: WorkspaceApp }) {
  const icon = <span className={`${styles.iconSurface} ${styles[`icon_${app.icon}`]}`}><AppGlyph icon={app.icon} /></span>;

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
            <Link href="/workspace" className={styles.mobileStat}><span aria-hidden="true">♧</span><strong>{organizationCount}</strong><small>Orgs</small></Link>
            <Link href="/workspace/websites" className={styles.mobileStat}><span aria-hidden="true">◎</span><strong>{websiteCount}</strong><small>Websites</small></Link>
            <a href="#apps-title" className={styles.mobileStat}><span aria-hidden="true">▦</span><strong>{WORKSPACE_APPS.filter((app) => app.status === "available").length}</strong><small>Apps</small></a>
            <Link href="/workspace/domains" className={styles.mobileStat}><span aria-hidden="true">↗</span><strong>↗</strong><small>Domains</small></Link>
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
      <MobileExperience userId={userId} />
      <AssistiveOrb />
    </main>
  );
}
