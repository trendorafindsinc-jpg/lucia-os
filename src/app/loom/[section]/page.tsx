import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import "./../loom.css";

const sections = {
  discover: { title: "Discover Loom", eyebrow: "FIND YOUR PEOPLE", description: "Search public conversations and find useful ideas from the community.", detail: "Public post search is available from the main feed. Group recommendations and member discovery are being connected to the same verified community data." },
  discussions: { title: "Discussions", eyebrow: "IDEAS IN MOTION", description: "Thoughtful conversations, practical questions, and lessons from people building businesses.", detail: "Open the community feed to read current public discussions and join threaded replies when your business is verified." },
  groups: { title: "Groups", eyebrow: "BUILD TOGETHER", description: "Focused spaces for people working on similar challenges and opportunities.", detail: "Group records and membership foundations are in place. Group creation, joining, and member permissions are being completed in the next delivery phase." },
  connections: { title: "Connections", eyebrow: "YOUR NETWORK", description: "Build meaningful professional relationships across the LUCIA community.", detail: "Connection request storage is in place. Requests, acceptance, blocking, and connection management are being wired to server-side permissions." },
  messages: { title: "Messages", eyebrow: "PRIVATE CONVERSATIONS", description: "A dedicated space for private one-to-one conversations.", detail: "Private message storage is in place. The inbox and conversation endpoints are being completed before messaging is enabled." },
  notifications: { title: "Notifications", eyebrow: "WHAT NEEDS YOUR ATTENTION", description: "Keep up with replies, connection requests, and community activity.", detail: "Notification storage is in place. Event generation, unread counts, and notification preferences are part of the next implementation pass." },
  saved: { title: "Saved posts", eyebrow: "KEEP WHAT MATTERS", description: "Return to useful advice, discussions, and ideas whenever you need them.", detail: "Saved-post storage is in place. Saving, unsaving, and the private saved-post list are being connected to authenticated APIs." },
  profile: { title: "Your Loom profile", eyebrow: "YOUR COMMUNITY IDENTITY", description: "Present your work and business clearly to the community.", detail: "Loom profile storage is in place. Profile editing and public profile views are being connected with privacy-aware access rules." },
} as const;

type Section = keyof typeof sections;

export const metadata: Metadata = { title: "Loom community spaces", description: "Explore the community areas in LUCIA Loom." };

export default async function LoomSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!(section in sections)) notFound();
  const key = section as Section;
  const item = sections[key];

  return (
    <main className="loom-page">
      <header className="loom-topbar">
        <Link className="loom-brand" href="/workspace"><span className="loom-brand-mark">L</span><span>LUCIA <b>LOOM</b></span></Link>
        <nav><Link href="/loom">Feed</Link><span className="loom-nav-active">{item.title}</span></nav>
        <Link className="loom-workspace-link" href="/workspace">Workspace ↗</Link>
      </header>
      <div className="loom-section-layout">
        <aside className="loom-left-rail">
          <span className="loom-rail-label">YOUR LOOM</span>
          <Link href="/loom">◉ Community feed</Link>
          {Object.entries(sections).map(([slug, entry]) => <Link key={slug} className={slug === key ? "loom-rail-active" : ""} href={`/loom/${slug}`}>{entry.title}</Link>)}
        </aside>
        <section className="loom-section-main">
          <span className="loom-eyebrow">{item.eyebrow}</span>
          <h1>{item.title}</h1>
          <p className="loom-section-description">{item.description}</p>
          <div className="loom-section-status">
            <span className="loom-eyebrow">IMPLEMENTATION STATUS</span>
            <h2>Being connected to the community engine</h2>
            <p>{item.detail}</p>
            <Link className="loom-section-primary" href={key === "discover" || key === "discussions" ? "/loom#feed" : "/loom"}>{key === "discover" ? "Search public posts on the feed ↗" : key === "discussions" ? "Read community conversations ↗" : "Open community feed ↗"}</Link>
          </div>
          <p className="loom-privacy-note">We show the current implementation state honestly. This area will not be presented as functional until its workflows are connected and access-controlled.</p>
        </section>
      </div>
    </main>
  );
}
