"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "./assistive-orb.module.css";

/** Presentation-only assistant entry point. No microphone, AI or network action is implied. */
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
            <div><strong>LUCIA Assistive Orb</strong><span className={styles.status}>Preview · idle</span></div>
            <button type="button" className={styles.close} onClick={() => setExpanded(false)} aria-label="Close assistive panel">×</button>
          </div>
          <p>This is a preview of the assistant interface. AI chat, voice listening and automated actions are not connected here yet.</p>
          <p className={styles.note}>You can continue using your workspace normally.</p>
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
