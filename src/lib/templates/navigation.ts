/** Build a typed Next.js link target from a catalogue design to durable website setup. */
export function getTemplateSetupHref(templateId: string): { pathname: "/create"; query: { template: string } } {
  return { pathname: "/create", query: { template: templateId } };
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
