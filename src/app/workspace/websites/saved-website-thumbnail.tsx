"use client";

import { useEffect, useRef, useState } from "react";
import { LayoutRenderer } from "@/components/layout-studio/layout-renderer";
import { websiteBlueprint, websiteDefinitionSchema, type WebsiteDefinition } from "@/lib/layout-blueprint/website-definition";

/** Real authorized saved-draft preview; lazy loading avoids rendering every site up front. */
export function SavedWebsiteThumbnail({ websiteId, name }: { websiteId: string; name: string }) {
  const root = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [scale, setScale] = useState(0.27);
  const [draft, setDraft] = useState<WebsiteDefinition | null>(null);
  const [state, setState] = useState<"waiting" | "loading" | "unavailable" | "ready">("waiting");

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const resize = new ResizeObserver(([entry]) => {
      setScale(Math.min(0.8, Math.max(0.1, entry.contentRect.width / 1080)));
    });
    resize.observe(node);
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisible(true);
    }, { rootMargin: "160px" });
    observer.observe(node);
    return () => { observer.disconnect(); resize.disconnect(); };
  }, []);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    const controller = new AbortController();
    void (async () => {
      setState("loading");
      try {
        const response = await fetch("/api/websites/" + encodeURIComponent(websiteId) + "/draft", {
          cache: "no-store", signal: controller.signal,
        });
        if (!response.ok) throw Error("Saved preview unavailable.");
        const payload = await response.json();
        const parsed = websiteDefinitionSchema.safeParse(payload.draft);
        if (!parsed.success) throw Error("Saved draft cannot be previewed.");
        if (active) { setDraft(parsed.data); setState("ready"); }
      } catch {
        if (active && !controller.signal.aborted) setState("unavailable");
      }
    })();
    return () => { active = false; controller.abort(); };
  }, [visible, websiteId]);

  return <div ref={root} className="studio-picker-preview studio-picker-real-preview"
    role="img" aria-label={state === "ready" ? "Actual saved website preview for " + name : "Preview not available for " + name}>
    {state === "ready" && draft ? <div className="studio-picker-render-window"
      style={{ transform: "scale(" + scale + ")" }} aria-hidden="true" inert>
      <LayoutRenderer blueprint={websiteBlueprint(draft)} preview idPrefix={"site-card-" + websiteId + "-"} />
    </div> : <div className="studio-picker-preview-fallback">
      <span aria-hidden="true">▣</span>
      <small>{state === "loading" || state === "waiting" ? "Loading saved website…" : "Open to view your website"}</small>
    </div>}
  </div>;
}
