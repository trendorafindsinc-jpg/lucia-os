import Link from "next/link";
import type { WorkspaceApp } from "@/lib/workspace/app-registry";
import { WORKSPACE_APPS, WORKSPACE_TOOLS } from "@/lib/workspace/app-registry";
import styles from "./workspace-launcher.module.css";

type WorkspaceLauncherProps = {
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
      return <svg {...common}><rect x="5" y="5" width="9" height="9" rx="2" /><rect x="18" y="5" width="9" height="9" rx="2" /><rect x="5" y="18" width="9" height="9" rx="2" /><rect x="18" y="18" width="9" height="9" rx="2" /></svg>;
    case "website":
      return <svg {...common}><rect x="4.5" y="5.5" width="23" height="21" rx="4" /><path d="M5 11h22M10 8.5h.01M13.5 8.5h.01M10 16h12M10 20h8" strokeLinecap="round" /></svg>;
    case "layouts":
      return <svg {...common}><rect x="5" y="5" width="22" height="22" rx="4" /><path d="M5 13h22M13 13v14M9 9h.01M12 9h.01M17 18h6M17 22h6" strokeLinecap="round" /></svg>;
    case "loomify-ai":
      return <svg {...common}><path d="M16 4.5 18.8 12l7.7 4-7.7 3.2L16 27.5l-2.8-8.3L5.5 16l7.7-4L16 4.5Z" strokeLinejoin="round" /><path d="m23.5 4 .9 2.5 2.6 1-2.6 1-.9 2.5-.9-2.5-2.6-1 2.6-1 .9-2.5Z" strokeLinejoin="round" /></svg>;
    case "loom":
      return <svg {...common}><circle cx="16" cy="16" r="11" /><path d="M11 20V12l5 5 5-5v8M9 8l2 2M23 8l-2 2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case "store":
      return <svg {...common}><path d="M6 13h20l-1.5 13h-17L6 13Z" strokeLinejoin="round" /><path d="M11 13V9a5 5 0 0 1 10 0v4M12 18h8" strokeLinecap="round" /></svg>;
  }
}

function AppTile({ app }: { app: WorkspaceApp }) {
  const icon = <span className={`${styles.iconSurface} ${styles[`icon_${app.icon}`]}`}><AppGlyph icon={app.icon} /></span>;

  if (app.status === "available" && app.href) {
    return (
      <Link className={styles.appTile} href={app.href} aria-label={app.label}>
        {icon}
        <span className={styles.appLabel}>{app.label}</span>
        <span className={styles.appDescription}>{app.description}</span>
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

export default function WorkspaceLauncher({ displayName, organizationCount, websiteCount }: WorkspaceLauncherProps) {
  const firstName = displayName.trim().split(/\s+/)[0] || "there";

  return (
    <main className={styles.workspace}>
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
          <p className={styles.eyebrow}>YOUR DIGITAL WORKSPACE</p>
          <h1 id="workspace-title">Welcome back, {firstName}.</h1>
          <p className={styles.lead}>Everything you use in LUCIA, together in one place.</p>
          <div className={styles.summary} aria-label="Workspace summary">
            <span><strong>{organizationCount}</strong> {organizationCount === 1 ? "organisation" : "organisations"}</span>
            <span className={styles.summaryDivider} aria-hidden="true" />
            <span><strong>{websiteCount}</strong> {websiteCount === 1 ? "website" : "websites"}</span>
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
    </main>
  );
}
