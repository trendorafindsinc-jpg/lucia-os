import { z } from "zod";
import { WORKSPACE_APPS } from "./app-registry";

export const WALLPAPERS = {
  aurora:
    "radial-gradient(ellipse at 75% 25%,#779cdb,transparent 60%),linear-gradient(165deg,#07172d,#344b86 47%,#b8b3e7)",
  ocean:
    "radial-gradient(ellipse at 70% 15%,#58b3c2,transparent 60%),linear-gradient(160deg,#041a32,#155b83 55%,#93d5e3)",
  midnight:
    "radial-gradient(ellipse at 20% 10%,#34416d,transparent 60%),linear-gradient(160deg,#040b19,#101e3d 60%,#384c78)",
  sunset:
    "radial-gradient(ellipse at 70% 20%,#f4a7ae,transparent 55%),linear-gradient(160deg,#29174a,#85528f 55%,#efb7a4)",
} as const;
export const HOME_ELIGIBLE = WORKSPACE_APPS.filter(
  (a) =>
    a.status === "available" &&
    a.href &&
    a.id !== "overview" &&
    a.id !== "settings",
);
const appId = z
  .string()
  .refine(
    (id) => HOME_ELIGIBLE.some((a) => a.id === id),
    "Unknown or unavailable Home application",
  );
export const preferencesSchema = z.object({
  version: z.literal(1).default(1),
  theme: z.enum(["system", "light", "dark"]).default("system"),
  wallpaper: z
    .enum(["aurora", "ocean", "midnight", "sunset"])
    .default("aurora"),
  showHomeApps: z.boolean().default(false),
  homeApps: z
    .array(appId)
    .max(32)
    .refine((a) => new Set(a).size === a.length)
    .default(["website-engine", "layouts"]),
  iconLayout: z.enum(["comfortable", "compact"]).default("comfortable"),
  motion: z.enum(["system", "reduce"]).default("system"),
  transparency: z.enum(["system", "reduce"]).default("system"),
  readability: z.enum(["standard", "large"]).default("standard"),
  dateFormat: z.enum(["system", "dmy", "mdy", "iso"]).default("system"),
  timeFormat: z.enum(["system", "12", "24"]).default("system"),
  timeZone: z
    .string()
    .max(64)
    .refine((v) => {
      try {
        if (v !== "system") new Intl.DateTimeFormat("en", { timeZone: v });
        return true;
      } catch {
        return false;
      }
    })
    .default("system"),
  preferredOrganizationId: z.uuid().nullable().default(null),
});
export type WorkspacePreferences = z.infer<typeof preferencesSchema>;
export const DEFAULT_PREFERENCES = preferencesSchema.parse({});
export type PreferenceEnvelope = {
  preferences: WorkspacePreferences;
  revision: number;
};
export function resolveOrganization<T extends { id: string }>(
  memberships: T[],
  preferred: string | null,
): T | null {
  return memberships.find((m) => m.id === preferred) ?? memberships[0] ?? null;
}
/** Import only explicitly understood legacy fields; images never enter account payloads. */
export function migrateLegacy(
  raw: string | null,
): Partial<WorkspacePreferences> | null {
  if (!raw || raw.length > 1_300_000) return null;
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== "object" || Array.isArray(v)) return null;
    const p: Partial<WorkspacePreferences> = {};
    if (Object.hasOwn(WALLPAPERS, v.wallpaper)) p.wallpaper = v.wallpaper;
    if (typeof v.showHomeApps === "boolean") p.showHomeApps = v.showHomeApps;
    return Object.keys(p).length ? p : null;
  } catch {
    return null;
  }
}
export function safeWallpaperData(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 1_250_000 &&
    /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)
  );
}
export async function validateWallpaper(file: File): Promise<string> {
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
    file.size > 900_000 ||
    file.size === 0
  )
    throw Error("Choose a JPG, PNG or WebP under 900 KB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const signature =
    file.type === "image/png"
      ? bytes.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10"
      : file.type === "image/jpeg"
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
          String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!signature)
    throw Error("The image content does not match its file type.");
  const bitmap = await createImageBitmap(file);
  const valid =
    bitmap.width > 0 &&
    bitmap.height > 0 &&
    bitmap.width <= 8192 &&
    bitmap.height <= 8192 &&
    bitmap.width * bitmap.height <= 24_000_000;
  bitmap.close();
  if (!valid)
    throw Error(
      "Choose an image smaller than 24 megapixels and 8192 pixels per side.",
    );
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string" && safeWallpaperData(reader.result)
        ? resolve(reader.result)
        : reject(Error("Unable to read image."));
    reader.onerror = () => reject(Error("Unable to read image."));
    reader.readAsDataURL(file);
  });
}

export function formatWorkspaceDate(
  date: Date,
  p: WorkspacePreferences,
): string {
  const timeZone = p.timeZone === "system" ? undefined : p.timeZone;
  const locale =
    p.dateFormat === "dmy"
      ? "en-GB"
      : p.dateFormat === "mdy"
        ? "en-US"
        : undefined;
  const dateText =
    p.dateFormat === "iso"
      ? new Intl.DateTimeFormat("sv-SE", {
          timeZone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(date)
      : new Intl.DateTimeFormat(locale, {
          timeZone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(date);
  return (
    dateText +
    " · " +
    new Intl.DateTimeFormat(undefined, {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      ...(p.timeFormat === "system" ? {} : { hour12: p.timeFormat === "12" }),
    }).format(date)
  );
}
