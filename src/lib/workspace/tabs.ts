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
    return { appKey: "website-editor", label: "Website editor", href: pathname + search, context };
  }
  if (pathname === "/create") {
    return { appKey: "website-create", label: "Website setup", href: pathname + search, context: templateId || "new" };
  }
  if (pathname === "/workspace/websites") {
    return { appKey: "websites", label: "Websites", href: pathname + search, context: "library" };
  }
  if (pathname === "/workspace/domains") {
    return { appKey: "domains", label: "Domains", href: pathname + search, context: websiteId || "library" };
  }
  if (pathname === "/workspace/team") {
    return { appKey: "team", label: "Team & access", href: pathname + search, context: "team" };
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
