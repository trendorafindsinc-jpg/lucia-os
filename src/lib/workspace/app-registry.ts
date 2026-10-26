export type WorkspaceAppStatus = "available" | "unavailable";

export type WorkspaceApp = {
  key: string;
  label: string;
  description: string;
  href?: string;
  status: WorkspaceAppStatus;
  icon: "overview" | "website" | "layouts" | "loom" | "store" | "portals" | "business";
  reason?: string;
};

export const WORKSPACE_APPS = [
  {
    key: "overview",
    label: "Overview",
    description: "Your LUCIA workspace",
    href: "/workspace",
    status: "available",
    icon: "overview",
  },
  {
    key: "website-engine",
    label: "Website Engine",
    description: "Create, edit and publish websites for free",
    href: "/workspace/websites",
    status: "available",
    icon: "website",
  },
  {
    key: "layouts",
    label: "Layouts",
    description: "Browse designs for your next website",
    href: "/templates",
    status: "available",
    icon: "layouts",
  },
  {
    key: "loom",
    label: "Loom",
    description: "A professional network for people and businesses",
    status: "unavailable",
    icon: "loom",
    reason: "Loom is not available in this release.",
  },
  {
    key: "store",
    label: "LUCIA Store",
    description: "Discover apps for your workspace",
    status: "unavailable",
    icon: "store",
    reason: "The Store is not available in this release.",
  },
  {
    key: "portals",
    label: "Portals",
    description: "Connected portals",
    status: "unavailable",
    icon: "portals",
    reason: "Portals are not available in v1.",
  },
  {
    key: "business-admin",
    label: "Business Admin",
    description: "Business administration tools",
    status: "unavailable",
    icon: "business",
    reason: "Business Admin is not available in v1.",
  },
] as const satisfies readonly WorkspaceApp[];

export const WORKSPACE_TOOLS = [
  { key: "websites", label: "Your websites", href: "/workspace/websites" },
  { key: "domains", label: "Domains", href: "/workspace/domains" },
  { key: "team", label: "Team & access", href: "/workspace/team" },
  { key: "support", label: "Help & support", href: "/support" },
] as const;

export function getWorkspaceApp(key: string): WorkspaceApp | undefined {
  return WORKSPACE_APPS.find((app) => app.key === key);
}
