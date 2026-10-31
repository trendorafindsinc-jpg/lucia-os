import { getCurrentUser } from "@/lib/auth/session";
import { findReadableMedia } from "@/lib/media/service";
import { mediaStorage } from "@/lib/media/storage";
import { isPlatformHostname } from "@/lib/publishing/platform-hosts";
import { z } from "zod";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return new Response("Not found", { status: 404 });
  try {
    const hostname = (request.headers.get("host") || new URL(request.url).hostname).trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
    const user = isPlatformHostname(hostname) ? await getCurrentUser().catch(() => null) : null;
    const row = await findReadableMedia(id, user?.id ?? null);
    if (!row) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
    const bytes = await mediaStorage().get(row.object_key);
    if (bytes.length !== row.bytes) throw Error("Stored image mismatch");
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "image/webp", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox", "Cache-Control": row.public ? "public,max-age=300" : "private,no-store" } });
  } catch { return new Response("Image temporarily unavailable", { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
