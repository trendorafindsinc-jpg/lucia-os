import { describe, expect, it } from "vitest";
import { addMediaAsset, addPost, contentLibrarySchema, makeEmptyLibrary, makeSlug } from "./content-library";

describe("blog and media content model", () => {
  it("creates a valid draft", () => {
    const library = addPost(makeEmptyLibrary(), "Our first update", new Date("2026-10-18T12:00:00.000Z"));
    expect(library.posts[0]).toMatchObject({ title: "Our first update", slug: "our-first-update", status: "draft" });
    expect(contentLibrarySchema.safeParse(library).success).toBe(true);
  });
  it("creates unique slugs for duplicate titles", () => {
    const first = addPost(makeEmptyLibrary(), "News");
    expect(addPost(first, "News").posts.map((post) => post.slug)).toEqual(["news", "news-2"]);
  });
  it("normalises accented titles", () => expect(makeSlug("Café & Éducation")).toBe("cafe-education"));
  it("rejects duplicate slugs and missing featured media", () => {
    const base = addPost(makeEmptyLibrary(), "News");
    const invalid = { ...base, posts: [{ ...base.posts[0], featuredImageId: "missing" }, { ...base.posts[0], id: "post-2" }] };
    expect(contentLibrarySchema.safeParse(invalid).success).toBe(false);
  });
  it("registers media metadata without pretending to upload a file", () => {
    const library = makeEmptyLibrary();
    const asset = { id: "asset-one", name: "Banner", kind: "image" as const, source: "https://example.com/banner.jpg", altText: "A banner", caption: "", createdAt: "2026-10-18T12:00:00.000Z" };
    const next = addMediaAsset(library, asset);
    expect(next.assets).toHaveLength(1);
    expect(addMediaAsset(next, asset)).toBe(next);
  });

  it("rejects executable URLs and unsafe media storage paths", () => {
    const base = {
      id: "asset-safe",
      name: "Banner",
      kind: "image" as const,
      altText: "",
      caption: "",
      createdAt: "2026-10-18T12:00:00.000Z",
    };
    expect(contentLibrarySchema.safeParse({ posts: [], assets: [{ ...base, source: "javascript:alert(1)" }] }).success).toBe(false);
    expect(contentLibrarySchema.safeParse({ posts: [], assets: [{ ...base, source: "assets/../private.jpg" }] }).success).toBe(false);
    expect(contentLibrarySchema.safeParse({ posts: [], assets: [{ ...base, source: "assets/banner.jpg" }] }).success).toBe(true);
  });
});
