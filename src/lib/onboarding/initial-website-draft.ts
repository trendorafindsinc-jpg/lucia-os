import { makeInitialDraft, siteDraftSchema } from "@/lib/editor/site-draft";
import { getTemplateById } from "@/lib/templates/catalogue";

/** Build the persisted editor state for a newly created website. */
export function makeInitialWebsiteDraft(templateId: string, websiteName: string) {
  if (!getTemplateById(templateId)) throw new Error("Choose a valid catalogue template.");
  return siteDraftSchema.parse({
    ...makeInitialDraft(templateId),
    siteName: websiteName,
  });
}
