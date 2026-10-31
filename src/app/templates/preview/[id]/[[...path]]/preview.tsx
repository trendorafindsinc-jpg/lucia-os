"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import type { PremiumLayout } from "@/lib/layout-blueprint/premium-composition";
import { LayoutRenderer } from "@/components/layout-studio/layout-renderer";
import { getTemplateSetupHref } from "@/lib/templates/navigation";

export function LayoutPreview({ blueprint, pagePath }: { blueprint: PremiumLayout; pagePath: string }) {
  const router = useRouter();
  const previewContent = useRef<HTMLElement>(null);
  const navigate = (path: string) => {
    if (blueprint.pages.some((page) => page.path === path)) {
      router.push(("/templates/preview/" + blueprint.layoutId + (path === "/" ? "" : path)) as Route);
    }
  };
  // Keep the real public renderer; focus the selected page after route changes.
  useEffect(() => {
    previewContent.current?.focus({ preventScroll: true });
  }, [pagePath]);

  return <>
    <header style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", padding: 16, background: "#10263d", color: "#fff" }}>
      <Link href="/templates" style={{ color: "inherit" }}>← Back to Layout Library</Link>
      <label htmlFor="layout-preview-page">Preview page</label>
      <select id="layout-preview-page" value={pagePath} onChange={(event) => navigate(event.target.value)} style={{ padding: 10, maxWidth: "70vw", color: "#10263d", background: "#fff" }}>
        {blueprint.pages.map((page) => <option key={page.path} value={page.path}>{page.path === "/" ? "Home" : page.title}</option>)}
      </select>
      <Link href={getTemplateSetupHref(blueprint.layoutId)} style={{ padding: 12, border: "1px solid currentColor", color: "inherit" }}>Create this website</Link>
      <span>Fictional demonstration · Unpublished · Visual review ongoing</span>
    </header>
    <main ref={previewContent} tabIndex={-1} aria-label="Website demonstration preview" data-preview-page-path={pagePath}>
      <LayoutRenderer blueprint={blueprint} preview pagePath={pagePath} idPrefix="layout-preview-" onNavigate={navigate} />
    </main>
  </>;
}
