export function normalizeOrganizationName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\\s+/g, " ");
  if (name.length < 2 || name.length > 80 || /[\\u0000-\\u001f\\u007f]/.test(name)) return null;
  return name;
}

export function organizationSlugBase(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "workspace";
}
