import Link from "next/link";
import { getCurrentStaffUser } from "@/lib/access/guards";
import { SupportConversation } from "@/components/support/support-conversation";
export const metadata = { title: "Support case | LUCIA Staff" };
export const dynamic = "force-dynamic";
export default async function StaffCasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const staff = await getCurrentStaffUser("support.cases.read");
  if (!staff) return <main className="workspace-shell"><section className="workspace-card workspace-denied"><h1>Staff access required</h1><Link href="/api/auth/login?returnTo=%2Fstaff%2Fsupport">Sign in with LUCIA ID</Link><p><Link href="/staff">Staff overview</Link></p></section></main>;
  const canReply = Boolean(await getCurrentStaffUser("support.cases.reply"));
  const canResolve = Boolean(await getCurrentStaffUser("support.cases.resolve"));
  return <SupportConversation key={(await params).caseId} caseId={(await params).caseId} staffMode canClaim canReply={canReply} canResolve={canResolve} />;
}
