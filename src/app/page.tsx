import Link from "next/link";

const capabilities = [
  { number: "01", title: "Your organisation, in one place", description: "A dedicated workspace for each organisation, with membership and access controls designed in from the start." },
  { number: "02", title: "A website you can shape", description: "Choose a professional starting point, customise your pages, and publish when you are ready." },
  { number: "03", title: "Room to grow", description: "Add eligible specialist portals as your needs grow, without creating a separate deployment for every customer." }
];

export default function HomePage() {
  return (
    <main className="shell">
      <header className="topbar">
        <Link className="wordmark" href="/" aria-label="LUCIA OS home"><span className="brand-mark" aria-hidden="true">L</span><span>LUCIA <span className="muted-word">OS</span></span></Link>
        <span className="status-pill"><span className="status-dot" /> Foundation in progress</span>
      </header>
      <section className="hero" aria-labelledby="hero-title">
        <p className="eyebrow">ONE PLATFORM. YOUR ORGANISATION.</p>
        <h1 id="hero-title">Your work deserves<br /><span>a place of its own.</span></h1>
        <p className="hero-copy">LUCIA OS is being built to help organisations create a professional online presence and grow into the tools they need — from one secure workspace.</p>
        <div className="hero-actions">
          <Link className="auth-link" href="/api/auth/login">Sign in with LUCIA ID <span aria-hidden="true">↗</span></Link>
          <span className="auth-caption">Sign-in requires LUCIA Core access to be configured.</span>
        </div>
        <div className="hero-actions">
          <Link className="auth-link" href="/create">Start guided website setup <span aria-hidden="true">→</span></Link>
          <Link className="auth-link" href="/templates">Explore website templates <span aria-hidden="true">↗</span></Link>
          <Link className="auth-link" href="/editor">Try the visual editor <span aria-hidden="true">↗</span></Link>
          <Link className="auth-link" href="/pages">Manage pages &amp; navigation <span aria-hidden="true">↗</span></Link>
          <Link className="auth-link" href="/content">Open blog &amp; media library <span aria-hidden="true">↗</span></Link>
          <Link className="auth-link" href="/seo">Set up SEO &amp; social sharing <span aria-hidden="true">↗</span></Link>
          <Link className="auth-link" href="/versions">Drafts, preview &amp; rollback <span aria-hidden="true">↗</span></Link>
          <Link className="auth-link" href="/publish">Prepare publishing &amp; domains <span aria-hidden="true">↗</span></Link>
          <Link className="auth-link" href="/forms">Build forms &amp; review enquiries <span aria-hidden="true">↗</span></Link>
          <Link className="auth-link" href="/analytics">Measure analytics &amp; conversions <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="hero-note"><span className="note-icon" aria-hidden="true">✳</span><p><strong>Starting with websites.</strong><br />Specialist portals will be introduced in later, carefully tested phases.</p></div>
      </section>
      <section className="capabilities" aria-label="Platform principles">
        {capabilities.map((item) => <article className="capability" key={item.number}><span className="capability-number">{item.number}</span><h2>{item.title}</h2><p>{item.description}</p></article>)}
      </section>
      <footer className="footer"><span>Built with care by LUCIA.</span><span>Early foundation · Not yet open for customer use</span></footer>
    </main>
  );
}
