"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import type { PremiumLayout } from "@/lib/layout-blueprint/premium-composition";
import { LayoutRenderer } from "@/components/layout-studio/layout-renderer";
import { getTemplateSetupHref } from "@/lib/templates/navigation";
export function LayoutPreview({ blueprint, pagePath }: { blueprint: PremiumLayout; pagePath: string }) {
  const router = useRouter();
  const navigate = (path: string) => {
    if (blueprint.pages.some((page) => page.path === path)) router.push(("/templates/preview/" + blueprint.layoutId + (path === "/" ? "" : path)) as Route);
  };
  return <>
    <header style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", padding: 16, background: "#10263d", color: "#fff" }}>
      <Link href="/templates">← Layouts</Link>
      <label>Preview page <select value={pagePath} onChange={(event) => navigate(event.target.value)} style={{ marginLeft: 8, padding: 10, maxWidth: "70vw", color: "#10263d", background: "#fff" }}>
        {blueprint.pages.map((page) => <option key={page.path} value={page.path}>{page.path === "/" ? "Home" : page.title}</option>)}
      </select></label>
      <Link href={getTemplateSetupHref(blueprint.layoutId)} style={{ padding: 12, border: "1px solid currentColor" }}>Create this website</Link>
      <span>Demonstration preview · Nothing published</span>
    </header>
    <main aria-label="Website demonstration preview"><LayoutRenderer blueprint={blueprint} preview pagePath={pagePath} idPrefix="layout-preview-" onNavigate={navigate} /></main>
  </>;
}
