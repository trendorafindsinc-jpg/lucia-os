import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { sessions } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const token = (await cookies()).get("lucia_os_session")?.value;
  if (token) {
    const db = getDb();
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  }

  const response = NextResponse.redirect(new URL("/", request.url), { status: 303 });
  response.cookies.set("lucia_os_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || new URL(request.url).protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
