import { afterEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { compressImage } from "./image";
import { mediaIds, mediaReferencePattern } from "./references";
import { mediaStorage } from "./storage";
import { isSafeMediaObjectKey, multipartStorage } from "./multipart-storage";
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
    expect(mediaIds({body:"[Watch](media:"+id+")"})).toEqual([id]);
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
  it("signs multipart video storage, checks object metadata and streams byte ranges",async()=>{
    vi.stubEnv("S3_ENDPOINT","https://s3.eu-west-3.idrivee2.com");vi.stubEnv("S3_REGION","eu-west-3");vi.stubEnv("S3_BUCKET","lucia-os-customer-media-2026");vi.stubEnv("S3_ACCESS_KEY_ID","isolated-test-id");vi.stubEnv("S3_SECRET_ACCESS_KEY","isolated-test-not-a-real-key");
    const key=`os/${id}/${id}/${id}.mp4`,checksum="a".repeat(64);
    expect(isSafeMediaObjectKey(key)).toBe(true);expect(isSafeMediaObjectKey("../foreign/file.mp4")).toBe(false);
    const fetcher=vi.fn()
      .mockResolvedValueOnce(new Response("<InitiateMultipartUploadResult><UploadId>test-upload-id-123456</UploadId></InitiateMultipartUploadResult>",{status:200}))
      .mockResolvedValueOnce(new Response("<CompleteMultipartUploadResult><ETag>0123456789abcdef0123456789abcdef-1</ETag></CompleteMultipartUploadResult>",{status:200}))
      .mockResolvedValueOnce(new Response(null,{status:200,headers:{"content-length":"12","content-type":"video/mp4","etag":'"0123456789abcdef0123456789abcdef-1"',"x-amz-meta-sha256":checksum}}))
      .mockResolvedValueOnce(new Response("video bytes",{status:206,headers:{"content-range":"bytes 0-4/12"}}))
      .mockResolvedValueOnce(new Response(null,{status:204}))
      .mockResolvedValueOnce(new Response(`<ListMultipartUploadsResult><Upload><Key>${key}</Key><UploadId>orphan-upload-123456</UploadId><Initiated>2026-10-31T00:00:00.000Z</Initiated></Upload></ListMultipartUploadsResult>`,{status:200}));
    vi.stubGlobal("fetch",fetcher);
    const uploadId=await multipartStorage.create(key,"video/mp4","video",checksum);expect(uploadId).toBe("test-upload-id-123456");
    expect(fetcher.mock.calls[0][1].headers["x-amz-server-side-encryption"]).toBe("AES256");expect(fetcher.mock.calls[0][1].headers["x-amz-meta-sha256"]).toBe(checksum);
    expect(new URL(multipartStorage.signPart(key,uploadId,1)).searchParams.get("partNumber")).toBe("1");
    await multipartStorage.complete(key,uploadId,[{partNumber:1,etag:'"0123456789abcdef0123456789abcdef"'}]);
    const head=await multipartStorage.head(key);expect(head?.bytes).toBe(12);expect(head?.checksum).toBe(checksum);
    expect((await multipartStorage.stream(key,"bytes=0-4"))?.status).toBe(206);
    await multipartStorage.remove(key);const incomplete=await multipartStorage.listIncomplete();expect(incomplete).toHaveLength(1);expect(incomplete[0].uploadId).toBe("orphan-upload-123456");expect(fetcher).toHaveBeenCalledTimes(6);
  });
});
