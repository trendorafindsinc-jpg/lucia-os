"use client";

import React, { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import Link from "next/link";
import { DEFAULT_ORB_POSITION, parseOrbPosition, snapOrb, type OrbPosition } from "@/lib/workspace/orb-position";
import styles from "./assistive-orb.module.css";

/** Shared assistant entry on the launcher and every recognized app workspace. */
export function AssistiveOrb({ homeDock = false }: { homeDock?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [position, setPosition] = useState<OrbPosition>(DEFAULT_ORB_POSITION);
  const [dragPoint, setDragPoint] = useState<{x:number;y:number} | null>(null);
  const gesture = useRef<{id:number;x:number;y:number;dragged:boolean} | null>(null);
  const suppressClick = useRef(false);
  const panelId = React.useId();
  useEffect(() => {
    try { setPosition(parseOrbPosition(sessionStorage.getItem("lucia.orb.position.v1"))); } catch { /* Position is optional when storage is unavailable. */ }
  }, []);
  function savePosition(next: OrbPosition) {
    setPosition(next);
    try { sessionStorage.setItem("lucia.orb.position.v1", JSON.stringify(next)); } catch { /* Keep the current in-memory placement. */ }
  }
  function docked() { return homeDock && window.matchMedia("(max-width:680px)").matches; }
  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    if (docked() || event.button !== 0) return;
    gesture.current = {id:event.pointerId,x:event.clientX,y:event.clientY,dragged:false};
    suppressClick.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const current=gesture.current;
    if (!current || current.id !== event.pointerId) return;
    if (Math.hypot(event.clientX-current.x,event.clientY-current.y)>6) current.dragged=true;
    if (!current.dragged) return;
    setExpanded(false);
    setDragPoint({x:Math.max(40,Math.min(window.innerWidth-40,event.clientX)),y:Math.max(100,Math.min(window.innerHeight-150,event.clientY))});
  }
  function finishDrag(event: PointerEvent<HTMLButtonElement>, cancelled=false) {
    const current=gesture.current;
    if (!current || current.id !== event.pointerId) return;
    suppressClick.current=current.dragged && !cancelled;
    if(current.dragged && !cancelled)savePosition(snapOrb(event.clientX,event.clientY,window.innerWidth,window.innerHeight));
    gesture.current=null;
    setDragPoint(null);
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
  }
  const placement = {
    "--orb-top": dragPoint ? `${dragPoint.y-28}px` : `${position.y*100}dvh`,
    "--orb-left": dragPoint ? `${dragPoint.x-28}px` : position.side === "left" ? "max(12px, env(safe-area-inset-left))" : "auto",
    "--orb-right": dragPoint || position.side === "left" ? "auto" : "max(12px, env(safe-area-inset-right))",
  } as CSSProperties;
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
    <aside className={`${styles.root} ${homeDock ? styles.homeDock : ""} ${dragPoint ? styles.dragging : ""}`} style={placement} data-side={position.side} aria-label="LUCIA assistive controls">
      <section className={styles.panel} id={panelId} aria-label="LUCIA assistant information" hidden={!expanded}>
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
        aria-controls={panelId}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={(event) => finishDrag(event)}
        onPointerCancel={(event) => finishDrag(event,true)}
        onLostPointerCapture={() => { gesture.current=null;setDragPoint(null); }}
        onKeyDown={(event) => {
          if(docked())return;
          if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key)) {
            event.preventDefault();
            savePosition({side:event.key==="ArrowLeft"?"left":event.key==="ArrowRight"?"right":position.side,y:Math.min(.85,Math.max(.15,position.y+(event.key==="ArrowUp"?-.05:event.key==="ArrowDown"?.05:0)))});
          }
        }}
        title="Open Orb. Away from Home, drag to either edge or use arrow keys to move."
        onClick={() => { if(suppressClick.current){suppressClick.current=false;return;}setExpanded((value) => !value); }}
      >
        <span className={styles.halo} aria-hidden="true" /><span className={styles.orbit} aria-hidden="true" /><span className={styles.core} aria-hidden="true" />
      </button>
    </aside>
  );
}
