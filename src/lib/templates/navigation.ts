/** Build the supported path from a catalogue design to durable website setup. */
export function getTemplateSetupHref(templateId: string): string {
  return `/create?template=${encodeURIComponent(templateId)}`;
}
