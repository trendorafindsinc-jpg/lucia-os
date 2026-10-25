import { makeInitialDraft, siteDraftSchema } from "@/lib/editor/site-draft";

/** Build the persisted editor state for a newly created website. */
export function makeInitialWebsiteDraft(templateId: string, websiteName: string) {
  return siteDraftSchema.parse({
    ...makeInitialDraft(templateId),
    siteName: websiteName,
  });
}
