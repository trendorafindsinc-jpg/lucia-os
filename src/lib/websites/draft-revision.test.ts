import { describe, it, expect } from "vitest";
import {
  draftRevision,
  isDraftRevision,
  websiteMutationAllowed,
  isUniqueWebsiteWrite,
} from "./draft-revision";
describe("resource-bound optimistic draft preconditions", () => {
  it("is stable for the durable value and changes for another resource or content", () => {
    const value = draftRevision("a", "draft");
    expect(isDraftRevision(value)).toBe(true);
    expect(draftRevision("a", "draft")).toBe(value);
    expect(draftRevision("b", "draft")).not.toBe(value);
    expect(draftRevision("a", "newer")).not.toBe(value);
  });
  it.each([null, "*", 'W/"weak"', "arbitrary", "draft-" + "a".repeat(64)])(
    "rejects an unsafe precondition %s",
    (value) => expect(isDraftRevision(value)).toBe(false),
  );
  it("classifies a wrapped unique violation without exposing SQL or following cycles forever", () => {
    expect(
      isUniqueWebsiteWrite({
        message: "Failed query",
        cause: { code: "23505" },
      }),
    ).toBe(true);
    const cyclic: { cause?: unknown } = {};
    cyclic.cause = cyclic;
    expect(isUniqueWebsiteWrite(cyclic)).toBe(false);
  });
  it("denies cross-site and malformed browser origins", () => {
    expect(
      websiteMutationAllowed(
        new Request("https://os.example/api", {
          headers: { origin: "https://evil.example" },
        }),
      ),
    ).toBe(false);
    expect(
      websiteMutationAllowed(
        new Request("https://os.example/api", { headers: { origin: "null" } }),
      ),
    ).toBe(false);
    expect(
      websiteMutationAllowed(
        new Request("https://os.example/api", {
          headers: {
            origin: "https://os.example",
            "sec-fetch-site": "cross-site",
          },
        }),
      ),
    ).toBe(false);
    expect(
      websiteMutationAllowed(
        new Request("https://os.example/api", {
          headers: { origin: "https://os.example" },
        }),
      ),
    ).toBe(true);
  });
});
