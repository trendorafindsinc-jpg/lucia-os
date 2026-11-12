import { getCurrentStaffUser } from "@/lib/access/guards";
import { StaffFrame } from "@/components/support/staff-frame";
import { StoragePanel } from "./storage-panel";
export const dynamic = "force-dynamic";
export default async function StoragePage() {
  if (!await getCurrentStaffUser("storage.manage")) return <main className="workspace-shell"><h1>Storage operator access required</h1><p>Storage administration requires an active platform operator grant.</p></main>;
  return <StaffFrame active="storage"><h1>Customer image storage</h1><StoragePanel /></StaffFrame>;
}
