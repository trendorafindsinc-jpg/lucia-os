import { describe, expect, it } from "vitest";
import { makeInitialDraft } from "@/lib/editor/site-draft";
import { mutateWebsite, websiteMutationSchema } from "./website-definition";
import {
  checkPremiumPublishContacts,
  isDemoContactEmail,
  sanitizePremiumPublicContacts,
} from "./premium-publish-readiness";
import { premiumCandidateIds } from "./premium-layouts/catalogue-candidates";
import { premiumLayoutSchema } from "./premium-composition";

describe("Phase 15 optional contact readiness and public placeholder suppression", () => {
  it.each(premiumCandidateIds)("%s publishes with optional starter contact details", (id) => {
    const initial = makeInitialDraft("northstar-consulting");
    const candidate = premiumLayoutSchema.parse(mutateWebsite(
      initial,
      websiteMutationSchema.parse({ kind: "assign-layout", layoutId: id }),
    ));
    const original = JSON.stringify(candidate);
    const readiness = checkPremiumPublishContacts(candidate);
    expect(readiness.ready).toBe(true);
    expect(readiness.recommendations.length).toBeGreaterThan(0);

    const publicCopy = sanitizePremiumPublicContacts(candidate);
    expect(JSON.stringify(publicCopy)).not.toMatch(/@example\.(?:com|org|net)/i);
    expect(JSON.stringify(candidate)).toBe(original);
    expect(publicCopy.identity.name).toBe(candidate.identity.name);
    expect(publicCopy.pages.map((page) => page.path)).toEqual(candidate.pages.map((page) => page.path));
  });

  it("does not suppress genuine customer email addresses", () => {
    const candidate = premiumLayoutSchema.parse(mutateWebsite(
      makeInitialDraft("northstar-consulting"),
      websiteMutationSchema.parse({ kind: "assign-layout", layoutId: "lucia.layout.meridian" }),
    ));
    const page = candidate.pages.find((entry) => entry.sections.some((section) => section.type === "contact-panel"));
    const contact = page?.sections.find((section) => section.type === "contact-panel");
    if (!page || contact?.type !== "contact-panel") throw Error("Contact panel missing");
    const customerEmail = "owner@lucia.ng";
    const edited = premiumLayoutSchema.parse(mutateWebsite(
      candidate,
      websiteMutationSchema.parse({
        kind: "composition-edit",
        mode: "guided",
        edits: [{ kind: "replace-section", pageId: page.id, section: { ...contact, email: customerEmail } }],
      }),
    ));
    const publicCopy = sanitizePremiumPublicContacts(edited);
    expect(JSON.stringify(publicCopy)).toContain(customerEmail);
    expect(isDemoContactEmail(customerEmail)).toBe(false);
  });

  it.each([
    "hello@example.com",
    "owner@example.org",
    "test@example.net",
    "hello@invalid",
    "name@yourdomain.com",
  ])("recognizes demonstration email %s", (email) => {
    expect(isDemoContactEmail(email)).toBe(true);
  });

  it("does not classify ordinary customer email addresses as demonstration data", () => {
    expect(isDemoContactEmail("contact@mybusiness.ng")).toBe(false);
    expect(isDemoContactEmail(undefined)).toBe(false);
  });
});
