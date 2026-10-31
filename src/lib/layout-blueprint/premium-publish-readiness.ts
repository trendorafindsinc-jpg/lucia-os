import type { PremiumLayout } from "./premium-composition";
import { premiumFlagshipIds } from "./premium-layouts/catalogue-candidates";

/**
 * A candidate may be previewed and edited for free, but cannot be published
 * with an unusable demonstration enquiry address. This check is additive:
 * existing v1 and Phase 13 structural website definitions are untouched.
 */
export function checkPremiumPublishContacts(
  definition: PremiumLayout,
): { ready: true } | { ready: false; reason: string } {
  if (!premiumFlagshipIds.some((id) => id === definition.layoutId))
    return { ready: true };
  const contacts = definition.pages.flatMap((page) =>
    page.sections.filter((s) => s.type === "contact-panel"),
  );
  if (!contacts.length)
    return { ready: false, reason: "Add an enquiry contact section before publishing." };
  for (const contact of contacts) {
    if (contact.type !== "contact-panel") continue;
    const email = contact.email?.trim().toLowerCase();
    if (!email || /@(?:example\.(?:com|org|net)|example|test|invalid|localhost)$/.test(email))
      return {
        ready: false,
        reason: "Replace all demonstration contact addresses with your verified business email in Layout Studio before publishing.",
      };
  }
  return { ready: true };
}
