import { z } from "zod";

export const websiteSnapshotSchema = z.object({
  siteName: z.string().trim().min(1).max(80),
  headline: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(220),
  palette: z.enum(["original", "ocean", "forest", "sunset"]),
  visibleSections: z.array(z.string().min(1)).max(12),
  pages: z.array(z.object({ id: z.string(), title: z.string(), slug: z.string(), sectionTypes: z.array(z.string()) })).max(50),
  seoTitle: z.string().max(70),
  seoDescription: z.string().max(200),
  contentPostCount: z.number().int().min(0).max(500),
  templateId: z.string().optional(),
  buttonLabel: z.string().optional(),
}).strict();

export type WebsiteSnapshot = z.infer<typeof websiteSnapshotSchema>;

export const websiteVersionSchema = z.object({
  id: z.string().regex(/^version-[a-z0-9-]{1,48}$/),
  label: z.string().trim().min(1).max(80),
  notes: z.string().max(500),
  createdAt: z.string().datetime(),
  snapshot: websiteSnapshotSchema,
}).strict();

export const versionHistorySchema = z.array(websiteVersionSchema).max(25).superRefine((versions, ctx) => {
  const ids = versions.map((version) => version.id);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", message: "Version IDs must be unique." });
});

export type WebsiteVersion = z.infer<typeof websiteVersionSchema>;
export type VersionHistory = z.infer<typeof versionHistorySchema>;

export function makeWebsiteSnapshot(input: WebsiteSnapshot): WebsiteSnapshot {
  return websiteSnapshotSchema.parse(JSON.parse(JSON.stringify(input)));
}

export function addVersion(history: VersionHistory, input: { label: string; notes?: string; snapshot: WebsiteSnapshot }, now = new Date()): VersionHistory {
  const label = input.label.trim();
  if (!label) throw new Error("Give this version a name.");
  const version: WebsiteVersion = websiteVersionSchema.parse({
    id: `version-${now.getTime().toString(36)}-${history.length + 1}`,
    label,
    notes: input.notes ?? "",
    createdAt: now.toISOString(),
    snapshot: makeWebsiteSnapshot(input.snapshot),
  });
  return versionHistorySchema.parse([version, ...history].slice(0, 25));
}

export function restoreVersion(version: WebsiteVersion): WebsiteSnapshot {
  return makeWebsiteSnapshot(version.snapshot);
}

export function formatVersionDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleString();
}
