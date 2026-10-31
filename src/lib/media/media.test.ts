import { afterEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { compressImage } from "./image";
import { mediaIds, mediaReferencePattern } from "./references";
import { mediaStorage } from "./storage";
import { premiumCandidate } from "@/lib/layout-blueprint/premium-layouts/catalogue-candidates";
import { applyPremiumEdit } from "@/lib/layout-blueprint/premium-composition";
const id = "b8e95a60-fbde-4c37-93e6-a2916c7b13d4";
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("customer media boundary", () => {
  it("decodes, autorotates, bounds dimensions and transcodes real image bytes", async () => {
    const input = await sharp({ create: { width: 2200, height: 1700, channels: 3, background: "#85a292" } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
    const result = await compressImage(input, "image/jpeg");
    const meta = await sharp(result.data).metadata();
    expect(meta.format).toBe("webp");
    expect(Math.max(result.width, result.height)).toBeLessThanOrEqual(1600);
    expect(result.bytes).toBeLessThanOrEqual(260000);
    expect(meta.exif).toBeUndefined();
    expect(meta.orientation).toBeUndefined();
  });
  it("rejects executable formats, corrupt bytes, MIME spoofing and oversize input", async () => {
    const png = await sharp({ create: { width: 5, height: 5, channels: 3, background: "white" } }).png().toBuffer();
    await expect(compressImage(Buffer.from('<svg onload="alert(1)"/>'), "image/svg+xml")).rejects.toThrow();
    await expect(compressImage(Buffer.from("bad image"), "image/jpeg")).rejects.toThrow();
    await expect(compressImage(png, "image/jpeg")).rejects.toThrow();
    await expect(compressImage(Buffer.alloc(4000001), "image/png")).rejects.toThrow();
  });
  it("allows safe owned-image locators in existing Guided Mode without accepting URLs", () => {
    const layout = premiumCandidate("lucia.layout.haven");
    const changed = applyPremiumEdit(layout, "guided", { kind: "business-logo", src: "media:" + id, alt: "Customer logo" });
    expect(mediaIds(changed)).toContain(id);
    expect(mediaReferencePattern.test("https://evil.test/picture.svg")).toBe(false);
    let nested: unknown = {}; for (let i = 0; i < 30; i++) nested = { nested };
    expect(() => mediaIds(nested)).toThrow("too deep");
    expect(mediaIds({ items: ["media:" + id, "media:" + id, "javascript:alert(1)"] })).toEqual([id]);
  });
  it("signs provider requests on the server and rejects caller-controlled keys", async () => {
    vi.stubEnv("S3_ENDPOINT", "https://s3.eu-west-3.idrivee2.com"); vi.stubEnv("S3_REGION", "eu-west-3"); vi.stubEnv("S3_BUCKET", "lucia-os-customer-media-2026");
    vi.stubEnv("S3_ACCESS_KEY_ID", "isolated-test-id"); vi.stubEnv("S3_SECRET_ACCESS_KEY", "isolated-test-not-a-real-key");
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 200 })); vi.stubGlobal("fetch", fetcher);
    const store = mediaStorage(); await store.put(`os/${id}/${id}/${id}.webp`, Buffer.from("test"));
    const [url, options] = fetcher.mock.calls[0];
    expect(url.hostname).toBe("s3.eu-west-3.idrivee2.com");
    expect(options.headers.authorization).toMatch(/^AWS4-HMAC-SHA256 Credential=isolated-test-id\/\d{8}\/eu-west-3\/s3\/aws4_request,/);
    expect(options.headers["x-amz-server-side-encryption"]).toBe("AES256");
    expect(options.redirect).toBe("error");
    await expect(store.put("../other-bucket/file", Buffer.from("bad"))).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
