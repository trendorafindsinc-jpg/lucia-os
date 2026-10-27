import { describe, expect, it } from "vitest";
import { resolveSafeReturnTo } from "./return-to";

describe("OAuth post-login destination", () => {
  it.each(["/workspace", "/staff", "/staff/support"])("allows an intentional destination: %s", (value) => {
    expect(resolveSafeReturnTo(value)).toBe(value);
  });

  it.each([
    undefined,
    null,
    "",
    "//evil.example",
    "https://evil.example",
    "/api/auth/callback",
    "/api/auth/login",
    "/staff?next=https://evil.example",
    "/staff/../api/auth/callback",
    "/tenant-site-internal",
    "/site/secret",
    "\\evil.example",
  ])("falls back for an unapproved destination: %s", (value) => {
    expect(resolveSafeReturnTo(value)).toBe("/workspace");
  });
});
