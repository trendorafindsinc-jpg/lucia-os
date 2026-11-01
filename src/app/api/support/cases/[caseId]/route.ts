import { getSupportCase } from "@/lib/support/case-handlers";
export const runtime = "nodejs";
type Context = { params: Promise<{ caseId: string }> };
export const GET = (request: Request, context: Context) => getSupportCase(request, context, false);
