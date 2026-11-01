import { makeInitialDraft, siteDraftSchema } from "@/lib/editor/site-draft";
import { premiumCandidate } from "@/lib/layout-blueprint/premium-layouts/catalogue-candidates";
import { isPremiumStartingLayout } from "@/lib/templates/starting-layouts";
import { websiteSetupSchema } from "./website-setup";
import { getTemplateById } from "@/lib/templates/catalogue";

/** Build the persisted editor state for a newly created website. */
export function makeInitialWebsiteDraft(templateId: string, websiteName: string) {
  if (!getTemplateById(templateId)) throw new Error("Choose a valid catalogue template.");
  return siteDraftSchema.parse({
    ...makeInitialDraft(templateId),
    siteName: websiteName,
  });
}

/** Construct the exact registered definition selected in the catalogue. */
export function makeStartingWebsiteDefinition(layoutId: string, websiteName: string) {
  const name = websiteSetupSchema.shape.websiteName.parse(websiteName);
  return isPremiumStartingLayout(layoutId) ? premiumCandidate(layoutId, name) : makeInitialWebsiteDraft(layoutId, name);
}

/** Serialize the structured draft exactly as Layer Studio restores it from the home page. */
export function serializeInitialWebsiteDraft(templateId: string, websiteName: string): string {
  return JSON.stringify(makeStartingWebsiteDefinition(templateId, websiteName));
}
