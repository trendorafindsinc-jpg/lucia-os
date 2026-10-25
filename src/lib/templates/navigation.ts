/** Build the supported path from a catalogue design to durable website setup. */
export function getTemplateSetupHref(templateId: string): string {
  return `/create?template=${encodeURIComponent(templateId)}`;
}

/** Prefer a valid template selected from Loom Library over an older saved setup choice. */
export function getPreferredTemplateId(
  requestedTemplateId: string | null,
  savedTemplateId: string,
  isKnownTemplate: (templateId: string) => boolean,
): string {
  if (requestedTemplateId && isKnownTemplate(requestedTemplateId)) return requestedTemplateId;
  return savedTemplateId;
}
