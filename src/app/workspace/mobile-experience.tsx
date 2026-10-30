"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { WORKSPACE_APPS } from "@/lib/workspace/app-registry";
import { WorkspaceIcon } from "@/components/workspace/workspace-icon";
import { AssistiveOrb } from "@/components/workspace/assistive-orb";
import styles from "./mobile-experience.module.css";
type View = "home" | "apps" | "activity" | "more";
export default function MobileExperience() {
  const screenRef = useRef<HTMLElement>(null);
  const [view, setView] = useState<View>("home");
  useEffect(() => {
    if (view === "home") return;
    screenRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setView("home");
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [view]);
  useEffect(() => {
    const openApps = () => setView("apps");
    window.addEventListener("lucia:open-app-library", openApps);
    return () => window.removeEventListener("lucia:open-app-library", openApps);
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(max-width:680px)");
    const background = document.querySelector<HTMLElement>(
      "[data-lucia-launcher-background]",
    );
    let restore = () => {};
    function sync() {
      restore();
      document.documentElement.dataset.luciaMobileView = view;
      if (view === "home" || !media.matches) return;
      const scrollY = window.scrollY;
      const { position, top, width, overflow } = document.body.style;
      const wasInert = background?.inert ?? false;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
      if (background) background.inert = true;
      restore = () => {
        Object.assign(document.body.style, { position, top, width, overflow });
        if (background) background.inert = wasInert;
        window.scrollTo(0, scrollY);
        restore = () => {};
      };
    }
    sync();
    media.addEventListener("change", sync);
    return () => {
      restore();
      media.removeEventListener("change", sync);
      delete document.documentElement.dataset.luciaMobileView;
    };
  }, [view]);
  return (
    <>
      <div className={styles.mobileExperience}>
        {view !== "home" && (
          <section
            ref={screenRef}
            tabIndex={-1}
            className={styles.screen}
            aria-label={view === "apps" ? "App Library" : view}
          >
            <div className={styles.screenHeader}>
              <button onClick={() => setView("home")} aria-label="Back">
                ‹
              </button>
              <h1>
                {view === "apps"
                  ? "Your Apps"
                  : view === "activity"
                    ? "Activity"
                    : "More"}
              </h1>
            </div>
            {view === "apps" && (
              <div className={styles.library}>
                {WORKSPACE_APPS.map((app) => (
                  <div key={app.id} className={styles.app}>
                    {app.status === "available" && app.href ? (
                      <Link
                        href={app.href}
                        className={styles.appIcon}
                        aria-label={app.label}
                      >
                        <WorkspaceIcon icon={app.icon} />
                      </Link>
                    ) : (
                      <span
                        className={styles.disabledIcon}
                        aria-label={app.reason || "Unavailable"}
                        title={app.reason}
                      >
                        <WorkspaceIcon icon={app.icon} />
                      </span>
                    )}
                    <span>{app.label}</span>
                  </div>
                ))}
              </div>
            )}
            {view === "activity" && (
              <p className={styles.note}>
                Your activity feed is not available yet. No activity is being
                displayed.
              </p>
            )}
            {view === "more" && (
              <div className={styles.more}>
                <Link href="/workspace/settings">
                  Settings <span>›</span>
                </Link>
                <Link href="/workspace/domains">
                  Domains <span>›</span>
                </Link>
                <Link href="/workspace/team">
                  Team & access <span>›</span>
                </Link>
                <Link href="/support">
                  Help & support <span>›</span>
                </Link>
              </div>
            )}
          </section>
        )}
        <nav
          className={`${styles.dock} lucia-mobile-workspace-dock`}
          aria-label="Mobile workspace navigation"
        >
          <button
            aria-current={view === "home" ? "page" : undefined}
            onClick={() => setView("home")}
          >
            <WorkspaceIcon icon="home" />
            <small>Home</small>
          </button>
          <button
            aria-current={view === "apps" ? "page" : undefined}
            onClick={() => setView("apps")}
          >
            <WorkspaceIcon icon="overview" />
            <small>Apps</small>
          </button>
          <span className={styles.orbSlot} aria-hidden="true" />
          <button
            aria-current={view === "activity" ? "page" : undefined}
            onClick={() => setView("activity")}
          >
            <WorkspaceIcon icon="activity" />
            <small>Activity</small>
          </button>
          <button
            aria-current={view === "more" ? "page" : undefined}
            onClick={() => setView("more")}
          >
            <WorkspaceIcon icon="more" />
            <small>More</small>
          </button>
        </nav>
      </div>
      <AssistiveOrb homeDock={view === "home"} />
    </>
  );
}
