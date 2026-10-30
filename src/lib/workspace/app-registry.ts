/**
 * Public, deterministic application catalogue. This file is safe for client bundles.
 * A registry entry is NOT an installation, purchase or access grant. Route handlers
 * and server-side tenant guards remain the enforcement boundary.
 */
export type AppId = "overview" | "website-engine" | "layouts" | "loomify-ai" | "loom" | "store" | "settings";
export type AppIconId = "overview" | "website" | "layouts" | "loomify-ai" | "loom" | "store" | "settings";
export type WorkspaceMode = "mobile" | "tablet" | "desktop";
export type AppAvailability = "built-in-available" | "configuration-required" | "installed-authorized" | "not-installed" | "temporarily-unavailable" | "access-denied" | "unsupported-mode" | "planned";
export type AppCategory = "workspace" | "creation" | "design" | "intelligence" | "community" | "commerce" | "preferences";
export type AppClass = "system" | "first-party" | "commercial";
export type AppRecovery = "none" | "session-snapshot" | "server-draft";
export type NativePaneAdapterId = "layout-studio" | "layouts";
export type CanonicalAppHref = "/workspace" | "/workspace/websites" | "/templates" | "/loomify-ai" | "/workspace/settings";
export type AppLaunch = { kind: "route"; href: CanonicalAppHref } | { kind: "local"; action: "open-settings" } | { kind: "none" };
export type WorkspaceAppStatus = "available" | "unavailable";

export type WorkspaceApp = {
  /** Immutable application identity: independent of label, route and product/version. */
  id: AppId;
  /** Compatibility alias for existing workspace consumers. */
  key: AppId;
  label: string;
  description: string;
  category: AppCategory;
  classification: AppClass;
  icon: AppIconId;
  iconAsset: { kind: "lucia-svg"; name: AppIconId };
  launch: AppLaunch;
  /** Compatibility route: only populated for route launches. */
  href?: CanonicalAppHref;
  status: WorkspaceAppStatus;
  availability: AppAvailability;
  reason?: string;
  context: "none" | "optional-website" | "organization";
  capabilities: {
    modes: readonly WorkspaceMode[];
    split: boolean;
    nativePaneAdapter?: NativePaneAdapterId;
    recovery: AppRecovery;
  };
  requiredPermissions: readonly string[];
  entitlement: { policy: "built-in" | "commercial-version"; reference?: string };
  lifecycle: { onClose: "confirm-if-dirty" | "immediate"; restore: AppRecovery };
  software?: { productId: string; versionId: string };
};

const ICONS: ReadonlySet<string> = new Set(["overview","website","layouts","loomify-ai","loom","store","settings"]);
const ROUTES: ReadonlySet<string> = new Set(["/workspace","/workspace/websites","/templates","/loomify-ai","/workspace/settings"]);
/** Do not allow external, encoded, query-bearing or arbitrary destinations in static metadata. */
export function isCanonicalAppDestination(href: unknown): href is CanonicalAppHref {
  return typeof href === "string" && ROUTES.has(href) &&
    href.startsWith("/") && !href.startsWith("//") && !href.includes("\\");
}

export function createAppRegistry<T extends WorkspaceApp>(entries: readonly T[]): readonly T[] {
  const ids = new Set<string>();
  for (const app of entries) {
    if (!/^[a-z][a-z0-9-]*$/.test(app.id) || app.key !== app.id || ids.has(app.id)) throw new Error("Invalid or duplicate application identifier");
    ids.add(app.id);
    if (!app.label.trim() || !app.description.trim() || !ICONS.has(app.icon) || app.iconAsset.kind !== "lucia-svg" || app.iconAsset.name !== app.icon) throw new Error("Incomplete application metadata");
    if (!app.capabilities.modes.length || new Set(app.capabilities.modes).size !== app.capabilities.modes.length) throw new Error("Invalid workspace modes");
    if (app.capabilities.split !== Boolean(app.capabilities.nativePaneAdapter)) throw new Error("Split requires an explicit native pane adapter");
    if (app.launch.kind === "route" && (!isCanonicalAppDestination(app.launch.href) || app.href !== app.launch.href)) throw new Error("Unsafe application launch");
    if (app.launch.kind !== "route" && app.href !== undefined) throw new Error("Non-route application cannot expose href");
    if (app.status === "available" && app.launch.kind === "none") throw new Error("Available application has no launch action");
    if (app.status === "unavailable" && (app.launch.kind !== "none" || !app.reason)) throw new Error("Unavailable application must be disabled with a reason");
    if (app.entitlement.policy === "commercial-version" && !app.software) throw new Error("Commercial app requires a version reference");
    if (app.classification !== "commercial" && app.software) throw new Error("Product identity cannot be assigned to built-in applications");
  }
  return Object.freeze([...entries]);
}

const ALL_MODES = ["mobile","tablet","desktop"] as const;
const B = { policy: "built-in" as const };
const available = "built-in-available" as const;
const noPermissions: readonly string[] = [];

export const WORKSPACE_APPS: readonly WorkspaceApp[] = createAppRegistry([
  {
    id:"overview",key:"overview",label:"Overview",description:"Your LUCIA workspace",
    category:"workspace",classification:"system",icon:"overview",iconAsset:{kind:"lucia-svg",name:"overview"},
    launch:{kind:"route",href:"/workspace"},href:"/workspace",status:"available",availability:available,
    context:"none",capabilities:{modes:ALL_MODES,split:false,recovery:"none"},
    requiredPermissions:noPermissions,entitlement:B,lifecycle:{onClose:"immediate",restore:"none"}
  },
  {
    id:"website-engine",key:"website-engine",label:"Layout Studio",description:"Create, edit and publish websites for free",
    category:"creation",classification:"first-party",icon:"website",iconAsset:{kind:"lucia-svg",name:"website"},
    launch:{kind:"route",href:"/workspace/websites"},href:"/workspace/websites",status:"available",availability:available,
    context:"optional-website",capabilities:{modes:ALL_MODES,split:true,nativePaneAdapter:"layout-studio",recovery:"session-snapshot"},
    requiredPermissions:noPermissions,entitlement:B,lifecycle:{onClose:"confirm-if-dirty",restore:"session-snapshot"}
  },
  {
    id:"layouts",key:"layouts",label:"Layouts",description:"Browse designs for your next website",
    category:"design",classification:"first-party",icon:"layouts",iconAsset:{kind:"lucia-svg",name:"layouts"},
    launch:{kind:"route",href:"/templates"},href:"/templates",status:"available",availability:available,
    context:"none",capabilities:{modes:ALL_MODES,split:true,nativePaneAdapter:"layouts",recovery:"session-snapshot"},
    requiredPermissions:noPermissions,entitlement:B,lifecycle:{onClose:"confirm-if-dirty",restore:"session-snapshot"}
  },
  {
    id:"loomify-ai",key:"loomify-ai",label:"loomifyAI",description:"Create AI design proposals and send them to Layout Studio",
    category:"intelligence",classification:"first-party",icon:"loomify-ai",iconAsset:{kind:"lucia-svg",name:"loomify-ai"},
    launch:{kind:"route",href:"/loomify-ai"},href:"/loomify-ai",status:"available",availability:available,
    context:"optional-website",capabilities:{modes:ALL_MODES,split:false,recovery:"none"},
    requiredPermissions:noPermissions,entitlement:B,lifecycle:{onClose:"confirm-if-dirty",restore:"none"}
  },
  {
    id:"loom",key:"loom",label:"Loom",description:"A professional network for people and businesses",
    category:"community",classification:"first-party",icon:"loom",iconAsset:{kind:"lucia-svg",name:"loom"},
    launch:{kind:"none"},status:"unavailable",availability:"planned",reason:"Loom is not available in this release.",
    context:"none",capabilities:{modes:ALL_MODES,split:false,recovery:"none"},
    requiredPermissions:["loom.member"],entitlement:B,lifecycle:{onClose:"immediate",restore:"none"}
  },
  {
    id:"store",key:"store",label:"LUCIA Store",description:"Discover apps for your workspace",
    category:"commerce",classification:"system",icon:"store",iconAsset:{kind:"lucia-svg",name:"store"},
    launch:{kind:"none"},status:"unavailable",availability:"planned",reason:"The Store is not available in this release.",
    context:"none",capabilities:{modes:ALL_MODES,split:false,recovery:"none"},
    requiredPermissions:noPermissions,entitlement:B,lifecycle:{onClose:"immediate",restore:"none"}
  },
  {
    id:"settings",key:"settings",label:"Settings",description:"Your LUCIA Control Center",
    category:"preferences",classification:"system",icon:"settings",iconAsset:{kind:"lucia-svg",name:"settings"},
    launch:{kind:"route",href:"/workspace/settings"},href:"/workspace/settings",status:"available",availability:available,
    context:"none",capabilities:{modes:ALL_MODES,split:false,recovery:"none"},
    requiredPermissions:noPermissions,entitlement:B,lifecycle:{onClose:"immediate",restore:"none"}
  },
]);

const registryById = new Map(WORKSPACE_APPS.map(app => [app.id, app]));
export function getWorkspaceApp(key: string): WorkspaceApp | undefined { return registryById.get(key as AppId); }
/** Navigation only. Never use this to authorize route access. */
export function getAppAvailability(app: WorkspaceApp, mode: WorkspaceMode, options?: {configured?: boolean; authorized?: boolean}): AppAvailability {
  if (app.status === "unavailable") return app.availability;
  if (!app.capabilities.modes.includes(mode)) return "unsupported-mode";
  if (options?.authorized === false) return "access-denied";
  if (options?.configured === false) return "configuration-required";
  return app.availability;
}
/** Installed entries require records from a trusted server-side source; none exist in Phase 7. */
export type AuthorizedInstallationSummary = {
  installationId: string;
  tenantId: string;
  appId: string;
  productId: string;
  versionId: string;
  authorized: true;
};
export function getInstalledAppAvailability(record: AuthorizedInstallationSummary | null, tenantId: string): AppAvailability {
  if (!record) return "not-installed";
  return record.authorized === true && record.tenantId === tenantId ? "installed-authorized" : "access-denied";
}

export const WORKSPACE_TOOLS = [
  { key:"websites",label:"Your websites",href:"/workspace/websites" },
  { key:"domains",label:"Domains",href:"/workspace/domains" },
  { key:"team",label:"Team & access",href:"/workspace/team" },
  { key:"support",label:"Help & support",href:"/support" },
] as const;
