"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function TeamMemberControls({ organizationId, membershipId, memberName, memberRole, memberStatus, actorRole, isSelf }: {
  organizationId: string; membershipId: string; memberName: string; memberRole: string; memberStatus: string; actorRole: string; isSelf: boolean;
}) {
  const router = useRouter();
  const [role, setRole] = useState(memberRole);
  const [status, setStatus] = useState(memberStatus);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const locked = isSelf || memberRole === "owner" || (actorRole !== "owner" && memberRole === "admin");

  async function update(payload: { role?: string; status?: string }) {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(membershipId)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update access.");
      if (data.member?.role) setRole(data.member.role);
      if (data.member?.status) setStatus(data.member.status);
      setMessage("Access updated.");
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not update access."); }
    finally { setBusy(false); }
  }

  if (locked) return <span className="team-member-protected">{isSelf ? "You" : memberRole === "owner" ? "Owner protected" : "Owner-managed"}</span>;

  return <div className="team-member-controls">
    <label><span className="sr-only">Role for {memberName}</span><select aria-label={`Role for ${memberName}`} value={role} disabled={busy || status !== "active"} onChange={(event) => { setRole(event.target.value); void update({ role: event.target.value }); }}><option value="editor">Editor</option><option value="viewer">Viewer</option>{actorRole === "owner" ? <option value="admin">Admin</option> : null}</select></label>
    <button type="button" disabled={busy} onClick={() => void update({ status: status === "active" ? "revoked" : "active" })}>{busy ? "Saving…" : status === "active" ? "Remove access" : "Restore access"}</button>
    {message ? <span className="team-member-feedback" role="status">{message}</span> : null}
    {error ? <span className="team-member-error" role="alert">{error}</span> : null}
  </div>;
}
