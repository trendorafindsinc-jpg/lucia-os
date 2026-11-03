import type { PremiumLayout } from "./premium-composition";
import { premiumCandidateIds } from "./premium-layouts/catalogue-candidates";

/** Demo addresses are editorial placeholders, never valid public contact details. */
export function isDemoContactEmail(value: string | undefined): boolean {
  if (!value) return false;
  const email = value.trim().toLowerCase();
  return /@(?:example\.(?:com|org|net)|example|test|invalid|localhost)$/.test(email)
    || /^(?:yourname|name|hello)@(?:yourdomain|business|company)\./.test(email);
}

/**
 * Contact details are recommendations, not publication prerequisites.
 * Missing or demonstration email addresses must never prevent publishing.
 */
export function checkPremiumPublishContacts(
  definition: PremiumLayout,
): { ready: true; recommendations: string[] } {
  if (!premiumCandidateIds.includes(definition.layoutId))
    return { ready: true, recommendations: [] };
  const contacts = definition.pages.flatMap((page) =>
    page.sections.filter((section) => section.type === "contact-panel"),
  );
  const recommendations: string[] = [];
  if (!contacts.length)
    recommendations.push("Consider adding a contact section so visitors know how to reach you.");
  if (contacts.some((contact) => contact.type === "contact-panel" && isDemoContactEmail(contact.email)))
    recommendations.push("Replace the demonstration email with your own address when ready.");
  if (contacts.some((contact) => contact.type === "contact-panel" && !contact.email))
    recommendations.push("Add an email address if you want visitors to contact you by email.");
  return { ready: true, recommendations };
}

/**
 * Strip only known placeholder email values from the public copy.
 * The saved customer draft remains untouched and editable; genuine supplied
 * contact details and all non-email content are retained.
 */
export function sanitizePremiumPublicContacts(
  definition: PremiumLayout,
): PremiumLayout {
  const profile = definition.identity.profile;
  const safeProfile = profile
    ? {
        ...profile,
        ...(isDemoContactEmail(profile.contactEmail) ? { contactEmail: undefined } : {}),
        ...(isDemoContactEmail(profile.enquiryEmail) ? { enquiryEmail: undefined } : {}),
      }
    : undefined;
  return {
    ...definition,
    identity: {
      ...definition.identity,
      ...(safeProfile ? { profile: safeProfile } : {}),
    },
    pages: definition.pages.map((page) => ({
      ...page,
      sections: page.sections.map((section) =>
        section.type === "contact-panel" && isDemoContactEmail(section.email)
          ? { ...section, email: undefined }
          : section,
      ),
    })),
  };
}
