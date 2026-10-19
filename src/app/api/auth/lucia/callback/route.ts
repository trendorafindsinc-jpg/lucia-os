import { GET as handleCallback } from "../../callback/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// This path must match the exact redirect URI registered in LUCIA Core.
export async function GET(request: Request) {
  return handleCallback(request);
}
