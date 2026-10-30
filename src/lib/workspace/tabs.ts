import { getWorkspaceApp } from "./app-registry";

export type WorkspaceRoute = {
  appKey: string;
  label: string;
  href: string;
  context: string;
};

export type WorkspaceTabIdentity = Pick<WorkspaceRoute, "appKey" | "context">;

export function describeWorkspaceRoute(pathname: string, search: string): WorkspaceRoute | null {
  const params = new URLSearchParams(search);
  const websiteId = params.get("websiteId");
  const templateId = params.get("template");
  const websiteContext = websiteId ? `website:${websiteId}` : "library";

  if (pathname === "/workspace/apps") return { appKey:"workspace-tools",label:"App Library",href:pathname+search,context:"apps" };
  if (pathname === "/workspace/settings") return { appKey:"settings",label:"Settings",href:pathname+search,context:"account" };
  if (pathname === "/workspace/desktop") {
    return { appKey: "desktop", label: "Lattice", href: pathname + search, context: "home" };
  }
  if (pathname === "/templates" || pathname === "/layouts") {
    return { appKey: "layouts", label: getWorkspaceApp("layouts")!.label, href: pathname + search, context: "catalogue" };
  }
  if (pathname === "/editor") {
    const context = websiteId ? `website:${websiteId}` : `template:${templateId || "new"}`;
    return { appKey: "website-engine", label: "Layout Studio editor", href: pathname + search, context };
  }
  if (pathname === "/create") {
    return { appKey: "website-engine", label: "Layout Studio setup", href: pathname + search, context: `setup:${templateId || "new"}` };
  }
  if (pathname === "/workspace/websites") {
    return { appKey: "website-engine", label: "Websites", href: pathname + search, context: "library" };
  }
  if (pathname === "/pages") {
    return { appKey: "website-engine", label: "Pages & navigation", href: pathname + search, context: websiteContext };
  }
  if (pathname === "/content") {
    return { appKey: "website-engine", label: "Blog & media", href: pathname + search, context: websiteContext };
  }
  if (pathname === "/workspace/domains") {
    return { appKey: "website-engine", label: "Domains", href: pathname + search, context: websiteContext };
  }
  if (pathname === "/workspace/team") {
    return { appKey: "workspace-tools", label: "Team & access", href: pathname + search, context: "team" };
  }
  if (pathname === "/publish") {
    return { appKey: "website-engine", label: "Publishing", href: pathname + search, context: websiteContext };
  }
  if (pathname === "/analytics") {
    return { appKey: "workspace-tools", label: "Analytics", href: pathname + search, context: websiteContext };
  }
  if (pathname === "/billing") {
    return { appKey: "workspace-tools", label: "Plan & billing", href: pathname + search, context: "account" };
  }
  if (pathname === "/forms") {
    return { appKey: "website-engine", label: "Forms", href: pathname + search, context: websiteContext };
  }
  if (pathname === "/seo") {
    return { appKey: "website-engine", label: "SEO", href: pathname + search, context: websiteContext };
  }
  if (pathname === "/versions") {
    return { appKey: "website-engine", label: "Versions", href: pathname + search, context: websiteContext };
  }
  if (pathname === "/support" || pathname.startsWith("/support/")) {
    return { appKey: "workspace-tools", label: "Help & support", href: pathname + search, context: pathname === "/support" ? "home" : pathname.slice("/support/".length) };
  }
  if (pathname === "/loomify-ai") {
    return { appKey: "loomify-ai", label: getWorkspaceApp("loomify-ai")!.label, href: pathname + search, context: websiteId ? `website:${websiteId}` : "library" };
  }
  if (pathname === "/loom") {
    return { appKey: "loom", label: getWorkspaceApp("loom")!.label, href: pathname + search, context: "home" };
  }
  return null;
}

export function getWorkspaceTabId(route: WorkspaceTabIdentity): string {
  return `${route.appKey}:${route.context}`;
}

export function canCloseWorkspaceTab(isDirty: boolean, userConfirmedDiscard: boolean): boolean {
  return !isDirty || userConfirmedDiscard;
}

export function isSafeWorkspaceTabHref(href: string): boolean {
  if (typeof href !== "string" || href.length > 1024 ||
      !href.startsWith("/") || href.startsWith("//") ||
      href.includes("\\") || /[\u0000-\u001f]/.test(href)) return false;
  try {
    const url = new URL(href, "https://workspace.invalid");
    if (url.origin !== "https://workspace.invalid" || url.hash ||
        url.pathname !== href.split("?")[0]) return false;
    const params = url.searchParams;
    if ([...params.keys()].some(key =>
      !/^[a-zA-Z][a-zA-Z0-9]{0,35}$/.test(key) ||
      params.getAll(key).length !== 1)) return false;
    // Lattice's app query is a nested local native-adapter route, never a remote URL.
    if (url.pathname === "/workspace/desktop" && params.has("app")) {
      const app = params.get("app") || "";
      return [...params.keys()].length === 1 &&
        /^\/(?:editor(?:\?websiteId=[a-zA-Z0-9_-]{1,128})?|templates)$/.test(app);
    }
    if ([...params.values()].some(value => !/^[a-zA-Z0-9_-]{1,128}$/.test(value))) return false;
    return describeWorkspaceRoute(url.pathname, url.search) !== null;
  } catch { return false; }
}

/** Never trust cached IDs, labels, roles, purchases or entitlement claims. */
export function recoverWorkspaceTabs(input: unknown): (WorkspaceRoute & { id: string; dirty: boolean })[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const recovered: (WorkspaceRoute & { id: string; dirty: boolean })[] = [];
  for (const item of input.slice(0, 100)) {
    if (!item || typeof item !== "object" || typeof item.href !== "string" ||
        typeof item.dirty !== "boolean" || !isSafeWorkspaceTabHref(item.href)) continue;
    const url = new URL(item.href, "https://workspace.invalid");
    const route = describeWorkspaceRoute(url.pathname, url.search);
    if (!route || getWorkspaceApp(route.appKey)?.status === "unavailable") continue;
    const id = getWorkspaceTabId(route);
    if (seen.has(id)) continue;
    seen.add(id);
    recovered.push({ ...route, id, dirty: item.dirty });
  }
  return recovered;
}

export type WorkspaceTabState = WorkspaceRoute & { id: string; dirty: boolean };
/** Evict only a clean tab; unsaved work must never disappear to enforce a visual limit. */
export function openWorkspaceTab<T extends {id:string;dirty:boolean}>(current: T[], next: T, preferredLimit = 12): T[] {
  if (current.some(tab => tab.id === next.id)) return current.map(tab => tab.id === next.id ? next : tab);
  if (current.length < preferredLimit) return [...current, next];
  const clean = current.findIndex(tab => !tab.dirty);
  return [...current.filter((_, index) => index !== clean), next];
}
