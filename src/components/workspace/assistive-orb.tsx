"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./assistive-orb.module.css";

/** Shared assistant entry on the launcher and every recognized app workspace. */
export function AssistiveOrb() {
  const [expanded, setExpanded] = useState(false);
  const orbRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExpanded(false);
        orbRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [expanded]);

  return (
    <aside className={styles.root} aria-label="LUCIA assistive controls">
      <section className={styles.panel} id="lucia-assistive-panel" aria-label="LUCIA assistant information" hidden={!expanded}>
          <div className={styles.heading}>
            <div><strong>LUCIA Orb · loomifyAI</strong><span className={styles.status}>Your workspace assistant</span></div>
            <button type="button" className={styles.close} onClick={() => setExpanded(false)} aria-label="Close assistive panel">×</button>
          </div>
          <p>Create AI design proposals with loomifyAI, then review them in Layout Studio.</p>
          <Link className={styles.action} href="/loomify-ai" onClick={() => setExpanded(false)}>Open loomifyAI →</Link>
          <p className={styles.note}>Voice and automated actions are not available yet.</p>
      </section>
      <button
        ref={orbRef}
        type="button"
        className={styles.orb}
        aria-label={expanded ? "Collapse LUCIA Assistive Orb" : "Expand LUCIA Assistive Orb"}
        aria-expanded={expanded}
        aria-controls="lucia-assistive-panel"
        onClick={() => setExpanded((value) => !value)}
      >
        <span className={styles.core} aria-hidden="true" />
      </button>
    </aside>
  );
}
