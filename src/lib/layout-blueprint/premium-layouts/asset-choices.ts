/** Client-side list of repository-owned image choices.
 * This list is presentation metadata only: the authoritative allow-list is
 * premiumAssets in premium-assets.ts and each update is schema validated.
 */
export const premiumArtworkChoices = [
  ...(["haven", "maison", "estate"] as const).map((name) => ({ ref: "builtin:premium/photograph-" + name, label: name[0].toUpperCase() + name.slice(1) + " generated photograph" })),
  ...(["portrait", "service-journey", "direction", "operations"] as const).map((name) => ({ ref: "builtin:meridian/" + name, label: "Meridian generated " + name })),
  { ref: "builtin:portfolio/work-1", label: "Original portfolio study" },
  { ref: "builtin:hospitality/hero", label: "Original retreat illustration" },
  { ref: "builtin:hospitality/stay", label: "Original room illustration" },
  ...([
    "business", "creative", "hospitality", "education", "commerce",
    "technology", "community", "services",
  ] as const).map((name) => ({
    ref: "builtin:premium/" + name,
    label: name[0].toUpperCase() + name.slice(1) + " illustration",
  })),
  ...([
    "meridian", "canvas", "haven", "academia",
    "maison", "nexus", "impact", "estate",
  ] as const).map((name) => ({
    ref: "builtin:premium/flagship-" + name,
    label: name[0].toUpperCase() + name.slice(1) + " flagship artwork",
  })),
  ...([
    "meridian", "canvas", "haven", "academia",
    "maison", "nexus", "impact", "estate",
  ] as const).map((name) => ({
    ref: "builtin:premium/project-" + name,
    label: name[0].toUpperCase() + name.slice(1) + " illustrated project",
  })),
] as const;
