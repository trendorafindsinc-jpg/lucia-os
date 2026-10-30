import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { preferencesSchema } from "@/lib/workspace/preferences";
import {
  readPreferences,
  savePreferences,
} from "@/lib/workspace/preference-store";
export const runtime = "nodejs";
const input = z.object({
  preferences: preferencesSchema,
  revision: z.number().int().min(0).max(2147483646),
});
const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { error: "Sign in to manage settings." },
      { status: 401, headers },
    );
  try {
    return NextResponse.json(await readPreferences(user.id), { headers });
  } catch {
    return NextResponse.json(
      { error: "Settings could not be loaded. Please retry." },
      { status: 503, headers },
    );
  }
}
export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { error: "Sign in to manage settings." },
      { status: 401, headers },
    );
  // Require same-origin JSON, including when browsers omit Fetch Metadata.
  const origin = request.headers.get("origin");
  const requestUrl = new URL(request.url);
  const host = request.headers.get("host") ?? requestUrl.host;
  let sameOrigin = false;
  try {
    const source = new URL(origin ?? "");
    sameOrigin =
      source.origin === origin &&
      source.host === host &&
      (source.protocol === "https:" ||
        (source.protocol === "http:" &&
          ["localhost", "127.0.0.1"].includes(source.hostname)));
  } catch {
    /* Reject missing or malformed Origin. */
  }
  if (!sameOrigin || request.headers.get("sec-fetch-site") === "cross-site")
    return NextResponse.json(
      { error: "Request origin denied." },
      { status: 403, headers },
    );
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return NextResponse.json(
      { error: "JSON required." },
      { status: 415, headers },
    );
  let body: unknown;
  try {
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 8192) {
          await reader.cancel();
          break;
        }
        chunks.push(value);
      }
    }
    if (size > 8192)
      return NextResponse.json(
        { error: "Settings are too large." },
        { status: 413, headers },
      );
    const raw = new TextDecoder("utf-8", { fatal: true }).decode(
      Buffer.concat(chunks),
    );
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON." },
      { status: 400, headers },
    );
  }
  const parsed = input.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid settings." },
      { status: 400, headers },
    );
  try {
    const result = await savePreferences(
      user.id,
      parsed.data.preferences,
      parsed.data.revision,
    );
    return NextResponse.json(result, {
      status: "error" in result ? result.status : 200,
      headers,
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Unable to save. Your current choices remain applied; retry when connected.",
      },
      { status: 503, headers },
    );
  }
}
