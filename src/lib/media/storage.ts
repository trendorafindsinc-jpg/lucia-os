import "server-only";
import { createHash, createHmac } from "node:crypto";
export interface MediaStorage { put(key: string, bytes: Buffer): Promise<void>; get(key: string): Promise<Buffer>; remove(key: string): Promise<void>; }
export function storageConfigured() { return Boolean(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY && process.env.S3_ENDPOINT && process.env.S3_BUCKET && process.env.S3_REGION); }
/** S3 SigV4 over a server-owned endpoint; no secrets or signed URLs reach callers. */
export function mediaStorage(): MediaStorage {
  if (!storageConfigured()) throw Error("Customer image storage is not configured.");
  const endpoint = new URL(process.env.S3_ENDPOINT!);
  if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.search || endpoint.pathname !== "/") throw Error("Invalid storage endpoint");
  const bucket = process.env.S3_BUCKET!;
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket)) throw Error("Invalid storage bucket");
  const digest = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
  const hmac = (key: string | Buffer, data: string) => createHmac("sha256", key).update(data).digest();
  async function request(method: string, key: string, body?: Buffer) {
    if (!/^os\/[0-9a-f-]+\/[0-9a-f-]+\/[0-9a-f-]+\.webp$/.test(key)) throw Error("Invalid object key");
    const url = new URL("/" + bucket + "/" + key, endpoint);
    const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, ""), day = date.slice(0, 8);
    const hash = digest(body ?? ""), region = process.env.S3_REGION!;
    const headers: Record<string, string> = { host: url.host, "x-amz-content-sha256": hash, "x-amz-date": date };
    if (method === "PUT") { headers["content-type"] = "image/webp"; headers["x-amz-server-side-encryption"] = "AES256"; }
    const names = Object.keys(headers).sort();
    const canonical = [method, url.pathname, "", names.map((name) => name + ":" + headers[name] + "\n").join(""), names.join(";"), hash].join("\n");
    const scope = `${day}/${region}/s3/aws4_request`;
    const keyDate = hmac("AWS4" + process.env.S3_SECRET_ACCESS_KEY!, day);
    const signature = hmac(hmac(hmac(hmac(keyDate, region), "s3"), "aws4_request"), "AWS4-HMAC-SHA256\n" + date + "\n" + scope + "\n" + digest(canonical)).toString("hex");
    headers.authorization = `AWS4-HMAC-SHA256 Credential=${process.env.S3_ACCESS_KEY_ID}/${scope}, SignedHeaders=${names.join(";")}, Signature=${signature}`;
    const response = await fetch(url, { method, headers, ...(body ? { body: new Uint8Array(body) } : {}), signal: AbortSignal.timeout(15000), redirect: "error", cache: "no-store" });
    if (!response.ok) throw Error("Object storage request failed.");
    return response;
  }
  return {
    async put(key, bytes) { await request("PUT", key, bytes); },
    async get(key) {
      const response = await request("GET", key);
      const reader = response.body?.getReader(); if (!reader) throw Error("Missing stored image");
      const chunks: Uint8Array[] = []; let bytes = 0;
      while (true) { const next = await reader.read(); if (next.done) break; bytes += next.value.length; if (bytes > 260000) { await reader.cancel(); throw Error("Invalid stored image"); } chunks.push(next.value); }
      return Buffer.concat(chunks);
    },
    async remove(key) { await request("DELETE", key); },
  };
}
