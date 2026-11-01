import { getSupportMessages, postSupportMessage } from "@/lib/support/message-handlers";
export const runtime = "nodejs";
type Context = { params: Promise<{ caseId: string }> };
export const GET = (request: Request, context: Context) => getSupportMessages(request, context, false);
export const POST = (request: Request, context: Context) => postSupportMessage(request, context, false);
