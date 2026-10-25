"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";

type Profile = { businessName: string | null; bio: string; website: string | null; avatarUrl?: string | null };

export function LoomProfile() {
  const [profile, setProfile] = useState<Profile>({ businessName: "", bio: "", website: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let alive = true;
    void fetch("/api/loom/profile", { cache: "no-store" })
      .then(async response => {
        const payload = await response.json() as { profile?: Profile; error?: string };
        if (!response.ok) throw new Error(payload.error || "Profile could not be loaded.");
        if (alive && payload.profile) setProfile(payload.profile);
      })
      .catch(cause => { if (alive) setError(cause instanceof Error ? cause.message : "Profile could not be loaded."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/loom/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ businessName: profile.businessName || "", bio: profile.bio, website: profile.website || "" }),
      });
      const payload = await response.json() as { profile?: Profile; error?: string };
      if (!response.ok || !payload.profile) throw new Error(payload.error || "Profile could not be saved.");
      setProfile(payload.profile);
      setNotice("Your profile has been saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Profile could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return <main className="loom-page">
    <header className="loom-topbar"><Link className="loom-brand" href="/workspace"><span className="loom-brand-mark">L</span><span>LUCIA <b>LOOM</b></span></Link><nav><Link href="/loom">Feed</Link><span className="loom-nav-active">Your profile</span></nav><Link className="loom-workspace-link" href="/workspace">Workspace ↗</Link></header>
    <div className="loom-section-layout"><aside className="loom-left-rail"><span className="loom-rail-label">YOUR LOOM</span><Link href="/loom">Community feed</Link><Link href="/loom/groups">Groups</Link><Link className="loom-rail-active" href="/loom/profile">Your profile</Link></aside>
      <section className="loom-section-main"><span className="loom-eyebrow">YOUR COMMUNITY IDENTITY</span><h1>Your Loom profile</h1><p className="loom-section-description">Tell the community what your business does and what you are here to build.</p>
        {loading ? <div className="loom-feed-state">Loading your profile…</div> : <form className="loom-group-form" onSubmit={save}>
          <label htmlFor="loom-profile-business">Business or display name</label><input id="loom-profile-business" value={profile.businessName || ""} onChange={event => setProfile(current => ({ ...current, businessName: event.target.value }))} maxLength={120} placeholder="Your business name" />
          <label htmlFor="loom-profile-bio">About</label><textarea id="loom-profile-bio" rows={5} value={profile.bio} onChange={event => setProfile(current => ({ ...current, bio: event.target.value }))} maxLength={500} placeholder="What do you build? What can you help others with?" />
          <label htmlFor="loom-profile-website">Website</label><input id="loom-profile-website" type="url" value={profile.website || ""} onChange={event => setProfile(current => ({ ...current, website: event.target.value }))} maxLength={300} placeholder="https://yourbusiness.com" />
          <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button>
          <p className="loom-privacy-note">Only share business information you intend to make public. Editing a public Loom profile requires verified business identity.</p>
        </form>}
        {error && <p className="loom-error" role="alert">{error}</p>}{notice && <p className="loom-notice" role="status">{notice}</p>}
      </section>
    </div>
  </main>;
}
