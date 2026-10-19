import type { Metadata } from "next";
import { SupportConversation } from "@/components/support/support-conversation";

export const metadata: Metadata = { title: "Support conversation | LUCIA OS" };
type PageContext = { params: Promise<{ caseId: string }> };

export default async function SupportCasePage({ params }: PageContext) {
  const { caseId } = await params;
  return <SupportConversation caseId={caseId} />;
}
