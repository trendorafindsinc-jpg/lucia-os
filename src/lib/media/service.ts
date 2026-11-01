import "server-only";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { getOrganizationMembershipsForUser } from "@/lib/access/guards";
import { hasOrganizationPermission } from "@/lib/access/policy";
import { mediaIds, mediaReferencePattern } from "./references";
import { compressImage } from "./image";
import { mediaStorage, storageConfigured } from "./storage";
import { multipartStorage } from "./multipart-storage";
export type MediaTransaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];
export class MediaError extends Error { constructor(message: string, public status = 422) { super(message); } }
type MediaRow = { id: string; website_id: string; organization_id: string; object_key: string; bytes: number; width: number; height: number; alt: string; status: string; kind: string; mime:string; original_name:string|null; checksum:string|null; etag:string|null; caption:string|null; duration_ms:number|null; upload_id:string|null };
export function boundedQuota(value: string | undefined, fallback: number) { const n = Number(value); return Number.isSafeInteger(n) && n > 0 && n <= 10_000_000_000 ? n : fallback; }
export const uploadsEnabled = () => process.env.MEDIA_UPLOADS_ENABLED === "1" && storageConfigured();
export async function withMediaWebsite<T>(userId: string, websiteId: string, permission: string, operation: (tx: MediaTransaction, organizationId: string) => Promise<T>): Promise<T> {
  for (const org of await getOrganizationMembershipsForUser(userId)) {
    if (!hasOrganizationPermission({ role: org.role, status: org.membershipStatus }, permission)) continue;
    const result = await getDb().transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.current_user_id', ${userId}, true), set_config('app.current_organization_id', ${org.id}, true)`);
      const authorized = await tx.execute(sql`select m.role,m.status from organization_memberships m join organizations o on o.id=m.organization_id join websites w on w.organization_id=o.id where m.user_id=${userId} and m.organization_id=${org.id} and m.status='active' and o.status='active' and w.id=${websiteId} and w.status <> 'deleted' limit 1`);
      const member = authorized[0] as { role: string; status: string } | undefined;
      if (!member || !hasOrganizationPermission(member, permission)) return { found: false as const };
      return { found: true as const, value: await operation(tx, org.id) };
    });
    if (result.found) return result.value;
  }
  throw new MediaError("Website not found or access denied.", 404);
}
/** Called in the SAME locked transaction as draft changes and publication. */
export async function validateMediaOwnership(tx: MediaTransaction, organizationId: string, websiteId: string, definition: unknown, publishing = false): Promise<Record<string,string>> {
  const altById:Record<string,string> = {};
  const featuredRef=definition&&typeof definition==="object"?(definition as {featuredMediaRef?:unknown}).featuredMediaRef:null;
  const featuredId=typeof featuredRef==="string"?mediaReferencePattern.exec(featuredRef)?.[1]??null:null;
  for (const id of mediaIds(definition)) {
    const rows = await tx.execute(sql`select id,alt,kind from website_media where id=${id} and organization_id=${organizationId} and website_id=${websiteId} and status='ready' for share`);
    const media = rows[0] as {id:string;alt:string;kind:string}|undefined;
    if (!media) throw new MediaError("A media asset is unavailable or belongs to another website.");
    if(featuredId===id&&media.kind!=="image")throw new MediaError("An article featured image must be an image asset.");
    altById[id]=media.alt;
    if (publishing) await tx.execute(sql`update website_media set last_published_at=now() where id=${id}`);
  }
  return altById;
}
export async function listMedia(userId: string, websiteId: string) {
  return withMediaWebsite(userId, websiteId, "website.read", async (tx) => {
    const rows = await tx.execute(sql`select id,bytes,width,height,alt,status,kind,mime,original_name,checksum,etag,caption,duration_ms,created_at from website_media where website_id=${websiteId} and status <> 'deleted' order by created_at desc limit 200`);
    const [usage] = await tx.execute(sql`select coalesce(sum(bytes),0)::bigint as used,count(*)::int as count,coalesce(sum(bytes) filter(where kind='image'),0)::bigint as image_used,coalesce(sum(bytes) filter(where kind='video'),0)::bigint as video_used,coalesce(sum(bytes) filter(where kind='document'),0)::bigint as document_used from website_media where website_id=${websiteId} and status <> 'deleted'`);
    const [limit] = await tx.execute(sql`select quota_bytes,video_quota_bytes,document_quota_bytes from website_media_limits where website_id=${websiteId}`);
    return { enabled: uploadsEnabled(), items: rows.map((row) => ({ ...row, ref: "media:" + row.id })), usedBytes: Number(usage?.used ?? 0), quotaBytes: Number(limit?.quota_bytes ?? boundedQuota(process.env.MEDIA_WEBSITE_QUOTA_BYTES, 5_000_000)),imageUsedBytes:Number(usage?.image_used??0),videoUsedBytes:Number(usage?.video_used??0),documentUsedBytes:Number(usage?.document_used??0),videoQuotaBytes:Number(limit?.video_quota_bytes??boundedQuota(process.env.MEDIA_VIDEO_WEBSITE_QUOTA_BYTES,500_000_000)),documentQuotaBytes:Number(limit?.document_quota_bytes??boundedQuota(process.env.MEDIA_DOCUMENT_WEBSITE_QUOTA_BYTES,50_000_000)) };
  });
}
export async function uploadMedia(userId: string, websiteId: string, input: Buffer, mime: string, alt: string) {
  await withMediaWebsite(userId, websiteId, "website.edit", async (tx) => {
    const [rate] = await tx.execute(sql`select count(*)::int as count from website_media where website_id=${websiteId} and created_at > now() - interval '1 minute'`);
    if (Number(rate?.count ?? 0) >= 10) throw new MediaError("Wait a minute before uploading more images.", 429);
  });
  if (!uploadsEnabled()) throw new MediaError("Customer uploads are not enabled yet. Built-in artwork remains available.", 503);
  const optimized = await compressImage(input, mime).catch(() => { throw new MediaError("Choose a decodable JPEG, PNG or WebP up to 4 MB and 24 million pixels."); });
  const id = randomUUID();
  const objectKey = await withMediaWebsite(userId, websiteId, "website.edit", async (tx, org) => {
    await tx.execute(sql`select reserved_bytes from media_storage_budget where product='lucia-os' for update`);
    const [rate] = await tx.execute(sql`select count(*)::int as count from website_media where website_id=${websiteId} and created_at > now() - interval '1 minute'`);
    if (Number(rate?.count ?? 0) >= 10) throw new MediaError("Wait a minute before uploading more images.", 429);
    const [usage] = await tx.execute(sql`select coalesce(sum(bytes),0)::bigint as used,count(*)::int as count from website_media where website_id=${websiteId} and status <> 'deleted'`);
    const [limit] = await tx.execute(sql`select quota_bytes from website_media_limits where website_id=${websiteId}`);
    if (Number(usage?.count ?? 0) >= 200) throw new MediaError("The image library has reached its 200-image limit.", 413);
    const quota = Number(limit?.quota_bytes ?? boundedQuota(process.env.MEDIA_WEBSITE_QUOTA_BYTES, 5_000_000));
    if (Number(usage?.used ?? 0) + optimized.bytes > quota) throw new MediaError("This website's image storage quota is full.", 413);
    const budget = boundedQuota(process.env.MEDIA_PRODUCT_BUDGET_BYTES, 2_000_000_000);
    const updated = await tx.execute(sql`update media_storage_budget set reserved_bytes=reserved_bytes+${optimized.bytes} where product='lucia-os' and reserved_bytes+${optimized.bytes} <= ${budget} returning product`);
    if (!updated.length) throw new MediaError("Storage capacity is unavailable. Try again later.", 507);
    const key = `os/${org}/${websiteId}/${id}.webp`;
    await tx.execute(sql`insert into website_media(id,organization_id,website_id,created_by_user_id,object_key,bytes,width,height,alt,status) values(${id},${org},${websiteId},${userId},${key},${optimized.bytes},${optimized.width},${optimized.height},${alt},'pending')`);
    return key;
  });
  // On an uncertain provider failure keep the pending record and its reservation.
  // Never report success or refund space for a possibly existing object.
  try { await mediaStorage().put(objectKey, optimized.data); }
  catch { throw new MediaError("Upload could not be confirmed. Its reserved space is retained for reconciliation; do not retry repeatedly.", 503); }
  await withMediaWebsite(userId, websiteId, "website.edit", async (tx) => {
    const ready = await tx.execute(sql`update website_media set status='ready',updated_at=now() where id=${id} and website_id=${websiteId} and status='pending' returning id`);
    if (!ready.length) throw new MediaError("Upload finalization was not confirmed. Refresh the library before retrying.", 503);
  });
  return { id, ref: "media:" + id, bytes: optimized.bytes, width: optimized.width, height: optimized.height, alt };
}
export async function removeMedia(userId: string, websiteId: string, id: string) {
  const row = await withMediaWebsite(userId, websiteId, "website.edit", async (tx) => {
    // Same order as save/publish: home row, then image row. Prevent reference races.
    await tx.execute(sql`select id from website_pages where website_id=${websiteId} and path='/' for update`);
    const [image] = await tx.execute(sql`select * from website_media where id=${id} and website_id=${websiteId} and (status in ('ready','deleting') or (status='pending' and created_at < now()-interval '24 hours')) for update`);
    if (!image) throw new MediaError("Media asset not found.", 404);
    const pattern = '%"media:' + id + '"%';
    const bodyPattern = '%media:' + id + '%';
    const refs = await tx.execute(sql`select 1 from website_pages where website_id=${websiteId} and (content like ${pattern} or published_content like ${pattern}) union all select 1 from website_versions where website_id=${websiteId} and (snapshot like ${pattern} or snapshot like ${bodyPattern}) union all select 1 from website_posts where website_id=${websiteId} and (featured_media_id=${id} or published_snapshot->>$key$featuredMediaRef$key$=${"media:"+id} or body like ${bodyPattern} or published_snapshot->>$key$body$key$ like ${bodyPattern}) union all select 1 from website_post_revisions where website_id=${websiteId} and (snapshot::text like ${pattern} or snapshot::text like ${bodyPattern}) limit 1`);
    if (refs.length || (image.last_published_at && new Date(String(image.last_published_at)).getTime() > Date.now() - 30 * 86400000)) throw new MediaError("This asset is retained by a draft, publication, recovery version or the 30-day publication grace period.", 409);
    await tx.execute(sql`update website_media set status='deleting',updated_at=now() where id=${id}`);
    return image as MediaRow;
  });
  if(row.kind==="image")await mediaStorage().remove(row.object_key);
  else if(row.status==="pending"&&row.upload_id){try{await multipartStorage.abort(row.object_key,row.upload_id);}catch{await multipartStorage.remove(row.object_key);}}
  else await multipartStorage.remove(row.object_key);
  await withMediaWebsite(userId, websiteId, "website.edit", async (tx) => {
    const removed = await tx.execute(sql`update website_media set status='deleted',updated_at=now() where id=${id} and status='deleting' returning bytes`);
    if (removed.length) await tx.execute(sql`update media_storage_budget set reserved_bytes=reserved_bytes-${row.bytes} where product='lucia-os'`);
  });
}
export async function findReadableMedia(id: string, userId: string | null) {
  if (userId) {
    for (const org of await getOrganizationMembershipsForUser(userId)) {
      if (!hasOrganizationPermission({ role: org.role, status: org.membershipStatus }, "website.read")) continue;
      const result = await getDb().transaction(async (tx) => {
        await tx.execute(sql`select set_config('app.current_user_id', ${userId}, true),set_config('app.current_organization_id', ${org.id}, true)`);
        const [row] = await tx.execute(sql`select m.* from website_media m join websites w on w.id=m.website_id and w.organization_id=m.organization_id where m.id=${id} and m.organization_id=${org.id} and m.status='ready' and w.status <> 'deleted'`);
        return row as MediaRow | undefined;
      });
      if (result) return { ...result, public: false };
    }
  }
  const [published] = await getDb().execute(sql`select * from lucia_public_media(${id}::uuid)`);
  return published ? { ...(published as MediaRow), public: true } : null;
}
