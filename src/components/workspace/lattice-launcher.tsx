"use client";
import React, { useId, useRef, useState } from "react";
import Link from "next/link";
import { LATTICE_APPS } from "@/lib/workspace/desktop";
import { WorkspaceIcon } from "./workspace-icon";
import styles from "./lattice-launcher.module.css";

export function LatticeLauncher({ compact = false, onLaunch }: { compact?: boolean; onLaunch?: () => void }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  return <div className={`${styles.root} ${compact ? styles.compact : ""}`} onKeyDown={event => {
    if(event.key === "Escape" && open){event.stopPropagation();setOpen(false);trigger.current?.focus();}
  }}>
    <button ref={trigger} type="button" className={styles.trigger} aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
      <span className={styles.mark}><WorkspaceIcon icon="lattice" /></span>
      <span className={styles.copy}><strong>Lattice</strong><small>Split workspace</small></span>
      {!compact && <span className={styles.appMarks} aria-hidden="true"><WorkspaceIcon icon="website" /><WorkspaceIcon icon="layouts" /></span>}
      <span className={styles.chevron} aria-hidden="true">{open ? "−" : "+"}</span>
    </button>
    <section hidden={!open} id={id} className={styles.picker} aria-label="Apps supported by Lattice">
      <p>Choose an app to start with.</p>
      <div className={styles.apps}>{LATTICE_APPS.map(app => <Link key={app.key} href={{ pathname: "/workspace/desktop", query: { app: app.href } }} onClick={() => {setOpen(false);onLaunch?.();}}>
        <WorkspaceIcon icon={app.icon} /><span>{app.label}</span><span aria-hidden="true">↗</span>
      </Link>)}</div>
      <small>Side by side on supported desktop screens. One app at a time on smaller screens.</small>
    </section>
  </div>;
}
