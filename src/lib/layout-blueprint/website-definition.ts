import { z } from "zod";
import { siteDraftSchema } from "@/lib/editor/site-draft";
import { siteDraftToLayoutBlueprint } from "./blueprint";
import {
  premiumLayoutSchema,
  premiumEditSchema,
  applyPremiumEdit,
} from "./premium-composition";
import { structuralLayout, structuralLayoutIds } from "./structural-layouts";
import { premiumCandidate, premiumCandidateIds } from "./premium-layouts/catalogue-candidates";

const legacyDefinitionSchema = z
  .object({
    schema: z.never().optional(),
    version: z.never().optional(),
    kind: z.never().optional(),
  })
  .passthrough()
  .pipe(siteDraftSchema);
export const websiteDefinitionSchema = z.union([
  premiumLayoutSchema,
  legacyDefinitionSchema,
]);
export type WebsiteDefinition = z.infer<typeof websiteDefinitionSchema>;
export const isPremium = (
  value: WebsiteDefinition,
): value is z.infer<typeof premiumLayoutSchema> =>
  "version" in value && value.version === 2;
export function websiteBlueprint(
  value: WebsiteDefinition,
  path = "/",
  title?: string,
) {
  return isPremium(value)
    ? value
    : siteDraftToLayoutBlueprint({
        ...value,
        ...(path !== "/" && title ? { headline: title } : {}),
      });
}
export function websiteSummary(value: WebsiteDefinition) {
  if (!isPremium(value))
    return {
      siteName: value.siteName,
      headline: value.headline,
      description: value.description,
    };
  const home = value.pages.find((p) => p.path === "/")!;
  return {
    siteName: value.identity.name,
    headline: home.title.slice(0, 100),
    description: home.description,
  };
}
export const websiteMutationSchema = z.union([
  z
    .object({
      kind: z.literal("assign-layout"),
      layoutId: z.enum([...structuralLayoutIds, ...premiumCandidateIds]),
    })
    .strict(),
  z
    .object({
      kind: z.literal("composition-edit"),
      mode: z.enum(["guided", "advanced"]),
      edits: z.array(premiumEditSchema).min(1).max(40),
    })
    .strict(),
  legacyDefinitionSchema,
]);
export function mutateWebsite(
  current: unknown,
  mutation: z.infer<typeof websiteMutationSchema>,
): WebsiteDefinition {
  const stored = websiteDefinitionSchema.parse(current);
  if (!("kind" in mutation)) {
    if (isPremium(stored))
      throw new Error("Use composition edits for this website");
    return mutation;
  }
  if (mutation.kind === "assign-layout") {
    if (isPremium(stored)) {
      if (!premiumCandidateIds.includes(mutation.layoutId))
        throw new Error("This design is not available for an existing composition");
      if (!stored.permissions.advanced.includes("tokens"))
        throw new Error("Design token changes are not permitted for this website");
      const candidate = premiumCandidate(mutation.layoutId, stored.identity.name);
      const tokens = { ...candidate.tokens };
      Object.assign(tokens, Object.fromEntries(
        stored.permissions.lockedTokens.map((locked) => [locked, stored.tokens[locked]]),
      ));
      const visualExperience = stored.permissions.visualExperienceLocked
        ? stored.visualExperience
        : candidate.visualExperience;
      // Change only the presentation system. Keep the customer's identity,
      // pages, paths, navigation, sections, media references and permissions.
      // Existing design locks remain authoritative; the normal authenticated,
      // tenant-scoped and revision-checked transaction validates media before
      // persisting this draft-only change.
      return premiumLayoutSchema.parse({
        ...stored,
        layoutId: candidate.layoutId,
        layoutVersion: candidate.layoutVersion,
        category: candidate.category,
        tokens,
        visualExperience,
      });
    }
    // A full canonical ID is deliberately distinct from the old structural
    // demo aliases. Assignment still runs inside existing authenticated,
    // organization-scoped, revision-checked server draft transactions.
    if (premiumCandidateIds.some((id) => id === mutation.layoutId))
      return premiumCandidate(mutation.layoutId, stored.siteName);
    return structuralLayout(mutation.layoutId as (typeof structuralLayoutIds)[number], stored.siteName);
  }
  if (!isPremium(stored))
    throw new Error("This website does not use composition edits");
  return mutation.edits.reduce(
    (definition, edit) => applyPremiumEdit(definition, mutation.mode, edit),
    stored,
  );
}

export function websitePageDetails(
  definition: WebsiteDefinition,
  path: string,
  title?: string,
) {
  if (isPremium(definition)) {
    const page = definition.pages.find((p) => p.path === path);
    if (!page) throw Error("Unknown website page");
    return { title: page.title, description: page.description };
  }
  return {
    title: path === "/" ? definition.siteName : (title ?? definition.headline),
    description: definition.description,
  };
}
