import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "./welcome.css";

export const metadata: Metadata = {
  title: "Build the business. Own the future. | LUCIA OS",
  description: "Start a free website, create your digital presence and explore a connected future in software entrepreneurship with LUCIA OS.",
  openGraph: {
    title: "Build the business. Own the future. | LUCIA OS",
    description: "The operating environment for ambitious builders. Start with a free website. Grow toward a software-powered business.",
    type: "website",
  },
};

const buildingBlocks = [
  {
    n: "01", icon: "◈", label: "AVAILABLE · START HERE",
    title: "Give your idea a home.",
    description: "Create and publish a professional website for free. Your business deserves a real presence from day one.",
    url: "/create", action: "Create a website",
  },
  {
    n: "02", icon: "▤", label: "AVAILABLE · DESIGN",
    title: "Stand out from the beginning.",
    description: "Find your direction among 48 premium Layouts. Personalise, preview and publish with LUCIA Layout Studio.",
    url: "/templates", action: "Explore Layouts",
  },
  {
    n: "03", icon: "⌘", label: "YOUR CONNECTED WORKSPACE",
    title: "Build from one command centre.",
    description: "Your websites, available apps, organisation and account controls have a place to work together.",
    url: "/api/auth/login?returnTo=%2Fworkspace", action: "Open the workspace",
  },
];

const opportunity = [
  { n: "01", title: "Establish", copy: "Begin with a real digital presence. Let customers see what you can do." },
  { n: "02", title: "Equip", copy: "Discover technology and specialist applications as the connected LUCIA ecosystem grows." },
  { n: "03", title: "Commercialise", copy: "Our long-term vision is software you can use, brand and build customer-facing businesses around." },
];

const previews = [
  { title: "Meridian", type: "Ambitious businesses", src: "/layouts/premium/flagships/meridian.svg" },
  { title: "Canvas", type: "Creative enterprises", src: "/layouts/premium/flagships/canvas.svg" },
  { title: "Nexus", type: "Digital-first brands", src: "/layouts/premium/flagships/nexus.svg" },
];

function Brand() {
  return <Link href="/" className="venture-brand" aria-label="LUCIA OS home">
    <span className="venture-brand__glyph" aria-hidden="true"><span /></span>
    <span className="venture-brand__word">LUCIA <span>OS</span></span>
  </Link>;
}

/** Product vision illustration: no earnings/statistics or fake interactive controls. */
function OpportunityEngine() {
  return <div className="venture-engine" role="img" aria-label="Concept illustration: LUCIA OS connects digital presence, technology and business opportunity">
    <div className="venture-engine__grid" aria-hidden="true" />
    <div className="venture-engine__ring venture-engine__ring--one" aria-hidden="true" />
    <div className="venture-engine__ring venture-engine__ring--two" aria-hidden="true" />
    <div className="venture-engine__ring venture-engine__ring--three" aria-hidden="true" />
    <div className="venture-engine__orb" aria-hidden="true"><span /></div>
    <div className="venture-engine__node venture-engine__node--one" aria-hidden="true" />
    <div className="venture-engine__node venture-engine__node--two" aria-hidden="true" />
    <div className="venture-engine__node venture-engine__node--three" aria-hidden="true" />
    <div className="venture-engine__panel venture-engine__panel--one" aria-hidden="true">
      <small>01 / ESTABLISH</small><strong>Digital presence</strong><span className="venture-engine__chart"><i /></span>
    </div>
    <div className="venture-engine__panel venture-engine__panel--two" aria-hidden="true">
      <small>02 / TECHNOLOGY</small><strong>The software economy</strong><span className="venture-engine__pixels"><i /><i /><i /><i /></span>
    </div>
    <div className="venture-engine__panel venture-engine__panel--three" aria-hidden="true">
      <small>03 / OPPORTUNITY</small><strong>Build something of your own</strong>
    </div>
    <span className="venture-engine__signature" aria-hidden="true"><i /> LUCIA IS LIGHT</span>
  </div>;
}

export default function HomePage() {
  return <main className="venture">
    <a href="#welcome-main" className="venture-skip">Skip to main content</a>
    <header className="venture-header">
      <div className="venture-wrap venture-header__inner">
        <Brand />
        <nav className="venture-header__links" aria-label="Welcome page navigation">
          <a href="#platform">The platform</a><a href="#opportunity">The opportunity</a><a href="#layouts">Layouts</a>
        </nav>
        <div className="venture-header__actions">
          <Link className="venture-header__signin" href="/api/auth/login?returnTo=%2Fworkspace">Sign in</Link>
          <Link className="venture-header__start" href="/create">Start building <span aria-hidden="true">↗</span></Link>
        </div>
      </div>
    </header>

    <section className="venture-hero" id="welcome-main" aria-labelledby="venture-title">
      <div className="venture-hero__glow" aria-hidden="true" />
      <div className="venture-wrap venture-hero__layout">
        <div className="venture-hero__content">
          <p className="venture-kicker"><i /> THE OPERATING SYSTEM FOR AMBITIOUS BUILDERS</p>
          <h1 id="venture-title">Build the business.<br /><span>Own the future.</span></h1>
          <p className="venture-hero__lead">Tomorrow’s great business could begin with one idea and the right technology. LUCIA OS gives ambitious people a foundation to create, establish and grow a digital enterprise—from a free website today to a bigger software-powered vision.</p>
          <div className="venture-actions">
            <Link className="venture-button venture-button--primary" href="/create">Start your free website <span aria-hidden="true">↗</span></Link>
            <a className="venture-button venture-button--secondary" href="#platform">Discover LUCIA OS <span aria-hidden="true">↓</span></a>
          </div>
          <p className="venture-hero__assurance">Standard website creation and publishing are free. No software purchase required.</p>
          <div className="venture-hero__proof" aria-label="LUCIA OS foundation">
            <div><strong>FREE</strong><span>Website creation</span></div>
            <div><strong>48</strong><span>Premium Layouts</span></div>
            <div><strong>ONE</strong><span>Connected workspace</span></div>
          </div>
        </div>
        <OpportunityEngine />
      </div>
      <div className="venture-wrap venture-hero__foot">
        <span>FOR CREATORS. FOUNDERS. THE NEXT GENERATION OF ENTREPRENEURS.</span>
        <a href="#platform">Explore the platform <span aria-hidden="true">↓</span></a>
      </div>
    </section>

    <section className="venture-marquee" aria-label="For the next generation of founders">
      <div className="venture-wrap"><span aria-hidden="true">✳</span><p>YOU DON’T HAVE TO OWN A TECH COMPANY TO <strong>START BUILDING ONE.</strong></p></div>
    </section>

    <section className="venture-section venture-platform" id="platform" aria-labelledby="platform-title">
      <div className="venture-wrap">
        <div className="venture-heading">
          <div><p className="venture-eyebrow">THE LUCIA FOUNDATION</p><h2 id="platform-title">Real tools for<br /><em>real ambition.</em></h2></div>
          <p>Your first step should be possible today. Start with a professional digital presence and a workspace that makes room for bigger ideas.</p>
        </div>
        <div className="venture-cards">{buildingBlocks.map((item) => <article className="venture-card" key={item.n}>
          <div className="venture-card__top"><span>{item.n} / THE FOUNDATION</span><b aria-hidden="true">{item.icon}</b></div>
          <p className="venture-card__label">{item.label}</p><h3>{item.title}</h3>
          <p className="venture-card__copy">{item.description}</p>
          <Link className="venture-card__link" href={item.url}>{item.action} <span aria-hidden="true">↗</span></Link>
        </article>)}</div>
      </div>
    </section>

    <section className="venture-opportunity" id="opportunity" aria-labelledby="opportunity-title">
      <div className="venture-wrap venture-opportunity__grid">
        <div className="venture-opportunity__message">
          <p className="venture-eyebrow">THE BIGGER PICTURE</p>
          <h2 id="opportunity-title">Don&apos;t just use software.<br /><em>Build a future around it.</em></h2>
          <p>Software can turn an idea into a repeatable service. A website can make your business discoverable. A connected platform can bring the pieces together. This is what LUCIA is building toward.</p>
          <div className="venture-opportunity__notice"><span aria-hidden="true">◉</span><p><strong>A vision, not a shortcut.</strong> LUCIA Store commerce, Loom professional networking and broader software commercialisation are evolving platform directions, not promises of instant income or features that are all available today.</p></div>
        </div>
        <div className="venture-steps">{opportunity.map((step) => <article className="venture-step" key={step.n}>
          <span>{step.n}</span><div><h3>{step.title}</h3><p>{step.copy}</p></div><b aria-hidden="true">↗</b>
        </article>)}</div>
      </div>
    </section>

    <section className="venture-section venture-gallery" id="layouts" aria-labelledby="layouts-title">
      <div className="venture-wrap">
        <div className="venture-heading">
          <div><p className="venture-eyebrow">YOUR FIRST BUSINESS ASSET</p><h2 id="layouts-title">Make your first move<br /><em>look extraordinary.</em></h2></div>
          <div className="venture-gallery__aside"><p>Explore professionally considered Layouts. Personalise the content and publish your website through LUCIA OS.</p><Link href="/templates">Explore all Layouts <span aria-hidden="true">↗</span></Link></div>
        </div>
        <div className="venture-layouts">{previews.map((item, index) => <Link className="venture-layout" href="/templates" key={item.title} aria-label={"Explore " + item.title + " and other Layouts"}>
          <div className="venture-layout__image"><div className="venture-layout__browser" aria-hidden="true"><i /><i /><i /><span>lucia / layouts</span></div><Image alt={item.title + " website Layout preview"} src={item.src} width={700} height={525} unoptimized /></div>
          <div className="venture-layout__caption"><div><small>0{index + 1} / LAYOUT</small><strong>{item.title}</strong><span>{item.type}</span></div><b aria-hidden="true">↗</b></div>
        </Link>)}</div>
      </div>
    </section>

    <section className="venture-close" aria-labelledby="close-title">
      <div className="venture-wrap venture-close__inner">
        <p className="venture-kicker"><i /> LUCIA IS LIGHT</p>
        <h2 id="close-title">Fortunes aren&apos;t downloaded.<br /><span>They&apos;re built.</span></h2>
        <p>Big ideas need action. Businesses need infrastructure. Your next chapter can start with a website, real customers and the courage to build.</p>
        <div className="venture-actions"><Link className="venture-button venture-button--primary" href="/create">Build your free website <span aria-hidden="true">↗</span></Link><Link className="venture-button venture-button--secondary" href="/api/auth/login?returnTo=%2Fworkspace">Sign in with LUCIA ID <span aria-hidden="true">→</span></Link></div>
        <small>Business outcomes depend on your execution, demand and the market. No earnings are guaranteed.</small>
      </div>
    </section>
    <footer className="venture-footer"><div className="venture-wrap venture-footer__inner">
      <div><Brand /><p>Technology for the people building what comes next.</p></div>
      <nav aria-label="Footer links"><a href="#platform">Platform</a><Link href="/templates">Layouts</Link><Link href="/create">Create</Link><Link href="/api/auth/login?returnTo=%2Fworkspace">LUCIA ID</Link></nav>
      <small>© LUCIA. Build with purpose.</small>
    </div></footer>
  </main>;
}
