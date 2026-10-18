import Link from "next/link";

const capabilityGroups = [
  {
    number: "01",
    name: "CREATE",
    title: "Start with a clear idea.",
    description: "Find your starting point, shape your pages, and bring your organisation’s story to life.",
    links: [
      { label: "Guided website setup", href: "/create", detail: "A guided first step" },
      { label: "Website templates", href: "/templates", detail: "Explore starting points" },
      { label: "Visual editor", href: "/editor", detail: "Shape your experience" }
    ]
  },
  {
    number: "02",
    name: "PUBLISH",
    title: "Make your presence known.",
    description: "Organise your content and prepare a considered, professional website for the world.",
    links: [
      { label: "Pages & navigation", href: "/pages", detail: "Structure your website" },
      { label: "Blog & media", href: "/content", detail: "Tell your story" },
      { label: "SEO & social sharing", href: "/seo", detail: "Help people find you" },
      { label: "Publishing & domains", href: "/publish", detail: "Prepare your website" }
    ]
  },
  {
    number: "03",
    name: "GROW",
    title: "Turn attention into progress.",
    description: "Give visitors useful ways to connect, then learn from the engagement you receive.",
    links: [
      { label: "Forms & enquiries", href: "/forms", detail: "Make room for conversations" },
      { label: "Analytics", href: "/analytics", detail: "Understand engagement" }
    ]
  },
  {
    number: "04",
    name: "MANAGE",
    title: "Move forward with confidence.",
    description: "Keep your work organised with thoughtful workflows and visibility into what comes next.",
    links: [
      { label: "Drafts & version history", href: "/versions", detail: "Review and roll back" },
      { label: "Plans & billing", href: "/billing", detail: "Explore plan information" }
    ]
  }
];

const principles = [
  {
    number: "01",
    title: "Your organisation. One home.",
    description: "A dedicated workspace designed around your organisation, with membership and access controls built into the foundation."
  },
  {
    number: "02",
    title: "Your vision. Your website.",
    description: "Start with a professional foundation, shape your pages, and prepare to publish when you are ready."
  },
  {
    number: "03",
    title: "Built for what comes next.",
    description: "Grow into eligible specialist portals as your needs evolve, without a separate deployment for every customer."
  }
];

function LightGeometry() {
  return (
    <div className="light-art" aria-hidden="true">
      <div className="light-art__halo" />
      <div className="light-art__orbit light-art__orbit--one" />
      <div className="light-art__orbit light-art__orbit--two" />
      <div className="light-art__orbit light-art__orbit--three" />
      <div className="light-art__diamond light-art__diamond--back" />
      <div className="light-art__diamond light-art__diamond--front" />
      <div className="light-art__core"><span /></div>
      <div className="light-art__beam light-art__beam--one" />
      <div className="light-art__beam light-art__beam--two" />
      <div className="light-art__node light-art__node--one" />
      <div className="light-art__node light-art__node--two" />
      <div className="light-art__node light-art__node--three" />
      <div className="light-art__caption"><span className="light-art__caption-dot" /> CLARITY IN MOTION</div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="landing">
      <div className="landing-noise" aria-hidden="true" />
      <header className="landing-nav">
        <Link className="landing-brand" href="/" aria-label="LUCIA OS home">
          <span className="landing-brand__symbol" aria-hidden="true"><span /></span>
          <span className="landing-brand__name">LUCIA <span>OS</span></span>
        </Link>
        <nav className="landing-nav__links" aria-label="Main navigation">
          <a href="#platform">Platform</a>
          <Link href="/templates">Templates</Link>
          <a href="#principles">Our approach</a>
        </nav>
        <div className="landing-nav__actions">
          <Link className="landing-signin" href="/api/auth/login">Sign in <span aria-hidden="true">↗</span></Link>
          <Link className="landing-nav__cta" href="/create">Start exploring <span aria-hidden="true">↗</span></Link>
        </div>
      </header>

      <section className="landing-hero" aria-labelledby="hero-title">
        <div className="landing-hero__copy">
          <p className="landing-eyebrow"><span className="landing-eyebrow__line" /> THE UNIVERSAL WEBSITE ENGINE</p>
          <h1 id="hero-title">Your vision deserves <span>its own space.</span></h1>
          <p className="landing-hero__lead">Bring your organisation’s digital presence into focus. Create a professional website, shape your story, and grow into the tools your work deserves — all through LUCIA OS.</p>
          <div className="landing-hero__actions">
            <a className="landing-button landing-button--primary" href="#platform">Explore LUCIA OS <span aria-hidden="true">↘</span></a>
            <Link className="landing-button landing-button--glass" href="/templates">Explore templates <span aria-hidden="true">↗</span></Link>
          </div>
          <p className="landing-hero__signin">Already have a LUCIA ID? <Link href="/api/auth/login">Sign in securely <span aria-hidden="true">→</span></Link></p>
          <div className="landing-proof"><span className="landing-proof__icon" aria-hidden="true">✳</span><span><strong>One thoughtful foundation.</strong><br />Designed to grow with your organisation.</span></div>
        </div>
        <div className="landing-hero__visual"><LightGeometry /></div>
        <div className="landing-hero__bottom" aria-hidden="true"><span>BUILT FOR YOUR NEXT CHAPTER</span><span className="landing-hero__bottom-rule" /><span>01 — THE BEGINNING</span></div>
      </section>

      <section className="landing-manifesto" aria-label="LUCIA philosophy">
        <p className="landing-eyebrow"><span className="landing-eyebrow__line" /> A CLEARER WAY FORWARD</p>
        <h2>Light on the work.<br /><span>Clarity in the journey.</span><br />Room to grow.</h2>
        <p>We believe every organisation deserves the tools and space to make its work visible — and the freedom to build toward what comes next.</p>
        <span className="manifesto-sun" aria-hidden="true"><span /></span>
      </section>

      <section className="landing-platform" id="platform" aria-labelledby="platform-title">
        <div className="landing-section-heading">
          <div><p className="landing-eyebrow"><span className="landing-eyebrow__line" /> THE PLATFORM</p><h2 id="platform-title">Everything starts<br /><span>with your presence.</span></h2></div>
          <p>From the first idea to the details that help a website grow, explore the building blocks of your digital home.</p>
        </div>
        <div className="capability-grid">
          {capabilityGroups.map((group) => (
            <article className={`capability-card capability-card--${group.number}`} key={group.number}>
              <div className="capability-card__top"><span>{group.number} / 04</span><span className="capability-card__symbol" aria-hidden="true">{group.number === "01" ? "◇" : group.number === "02" ? "↗" : group.number === "03" ? "⌁" : "✳"}</span></div>
              <p className="capability-card__eyebrow">{group.name}</p>
              <h3>{group.title}</h3>
              <p className="capability-card__description">{group.description}</p>
              <div className="capability-card__links">
                {group.links.map((item) => <Link href={item.href} key={item.href}><span>{item.label}</span><span aria-hidden="true">↗</span></Link>)}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-principles" id="principles" aria-labelledby="principles-title">
        <div className="landing-section-heading landing-section-heading--principles">
          <div><p className="landing-eyebrow"><span className="landing-eyebrow__line" /> BUILT AROUND YOUR WORK</p><h2 id="principles-title">A foundation with<br /><span>purpose and perspective.</span></h2></div>
          <p>Technology should bring clarity, not complexity. LUCIA OS starts with a focused foundation and makes room for a considered next step.</p>
        </div>
        <div className="principle-list">
          {principles.map((item) => <article className="principle-row" key={item.number}><span className="principle-row__number">{item.number}</span><h3>{item.title}</h3><p>{item.description}</p><span className="principle-row__arrow" aria-hidden="true">↗</span></article>)}
        </div>
      </section>

      <section className="landing-closing">
        <div className="closing-glow" aria-hidden="true"><span /></div>
        <p className="landing-eyebrow"><span className="landing-eyebrow__line" /> YOUR NEXT CHAPTER STARTS HERE</p>
        <h2>Give your next idea<br /><span>a place to shine.</span></h2>
        <p>Explore the LUCIA OS foundation and discover what your organisation can build.</p>
        <div className="landing-hero__actions landing-hero__actions--center">
          <Link className="landing-button landing-button--light" href="/create">Explore website setup <span aria-hidden="true">↗</span></Link>
          <Link className="landing-button landing-button--dark-glass" href="/templates">Browse templates <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <footer className="landing-footer">
        <Link className="landing-brand" href="/" aria-label="LUCIA OS home"><span className="landing-brand__symbol" aria-hidden="true"><span /></span><span className="landing-brand__name">LUCIA <span>OS</span></span></Link>
        <p>Light that moves business forward.</p>
        <nav aria-label="Footer navigation"><Link href="/templates">Templates</Link><Link href="/api/auth/login">LUCIA ID</Link><Link href="/billing">Plans</Link></nav>
        <span className="landing-footer__status">Early foundation · Not yet open for customer use</span>
        <span className="landing-footer__copyright">Built with care by LUCIA.</span>
      </footer>
    </main>
  );
}
