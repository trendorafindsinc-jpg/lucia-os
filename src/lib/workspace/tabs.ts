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
  if (pathname === "/templates" || pathname === "/layouts") {
    return { appKey: "layouts", label: "Layouts", href: pathname + search, context: "catalogue" };
  }
  if (pathname === "/editor") {
    const context = websiteId ? `website:${websiteId}` : `template:${templateId || "new"}`;
    return { appKey: "website-engine", label: "Website editor", href: pathname + search, context };
  }
  if (pathname === "/create") {
    return { appKey: "website-engine", label: "Website setup", href: pathname + search, context: `setup:${templateId || "new"}` };
  }
  if (pathname === "/workspace/websites") {
    return { appKey: "website-engine", label: "Websites", href: pathname + search, context: "library" };
  }
  if (pathname === "/workspace/domains") {
    return { appKey: "website-engine", label: "Domains", href: pathname + search, context: `domains:${websiteId || "library"}` };
  }
  if (pathname === "/workspace/team") {
    return { appKey: "workspace-tools", label: "Team & access", href: pathname + search, context: "team" };
  }
  if (pathname === "/loom") {
    return { appKey: "loom", label: "Loom", href: pathname + search, context: "home" };
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
  if (!href.startsWith("/") || href.startsWith("//")) return false;
  try {
    const url = new URL(href, "https://workspace.invalid");
    return url.origin === "https://workspace.invalid" && describeWorkspaceRoute(url.pathname, url.search) !== null;
  } catch {
    return false;
  }
}
