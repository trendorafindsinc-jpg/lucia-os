import { describe, expect, it } from "vitest";
import { makeSiteSlug, websiteSetupSchema } from "./website-setup";

const validSetup = {
  organisationName: "LUCIA Studio",
  websiteName: "LUCIA Studio",
  organisationType: "Business or service",
  goal: "Get enquiries or bookings",
  templateId: "northstar-consulting",
  country: "Nigeria",
  siteSlug: "lucia-studio",
} as const;

describe("guided website setup", () => {
  it("accepts a complete valid setup", () => {
    expect(websiteSetupSchema.safeParse(validSetup).success).toBe(true);
  });

  it("rejects unsafe or malformed site slugs", () => {
    expect(websiteSetupSchema.safeParse({ ...validSetup, siteSlug: "../other-site" }).success).toBe(false);
    expect(websiteSetupSchema.safeParse({ ...validSetup, siteSlug: "Upper Case" }).success).toBe(false);
  });

  it("requires a known catalogue template and meaningful names", () => {
    expect(websiteSetupSchema.safeParse({ ...validSetup, templateId: "not-real" }).success).toBe(false);
    expect(websiteSetupSchema.safeParse({ ...validSetup, websiteName: " " }).success).toBe(false);
  });

  it("turns an organisation name into a safe suggested slug", () => {
    expect(makeSiteSlug("  Étoile Learning & Co.  ")).toBe("etoile-learning-co");
    expect(makeSiteSlug("North Star")).toBe("north-star");
  });
});
