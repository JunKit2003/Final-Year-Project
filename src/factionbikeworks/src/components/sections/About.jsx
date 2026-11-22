import { Link } from "react-router";
import { Reveal } from "../../lib/motion";
import { shopStatus } from "../../../../shared/site-schema.js";
import { Marquee } from "../ui/Bits";
import { Markup } from "../ui/Markup";
import { Arrow, Clock, Facebook, Instagram, Phone, Pin, WhatsApp } from "../ui/Icons";

export function AboutStory({ content, photo }) {
  if (!content.visible) return null;
  return (
    <section className="section-sm">
      <div className="wrap about-story">
        <Reveal className="about-photo">{photo && <img src={photo} alt="The shop front" loading="lazy" />}</Reveal>
        <Reveal delay={120} className="about-copy">
          {content.kicker && <p className="kicker">{content.kicker}</p>}
          <h2 className="h2">
            <Markup text={content.title} />
          </h2>
          <p className="lead">{content.lead}</p>
          {content.paragraphs.map((p, i) => (
            <p key={i} className="muted">
              {p.value}
            </p>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

export function AboutMarquee({ content }) {
  if (!content.visible || !content.items.length) return null;
  return <Marquee items={content.items.map((i) => i.value)} speed={30} />;
}

export function AboutContact({ content, shop, hours }) {
  if (!content.visible) return null;
  const status = shopStatus(hours);
  const cards = [
    { icon: Pin, title: content.findTitle, main: shop.addressShort, sub: shop.address, href: shop.maps },
    { icon: Phone, title: content.callTitle, main: shop.phone, sub: content.callSub, href: shop.whatsapp },
    { icon: Clock, title: status.label, main: content.hoursMain, sub: content.hoursSub, href: null },
  ];
  return (
    <section className="section">
      <div className="wrap contact-grid">
        {cards.map((c, i) => {
          const Tag = c.href ? "a" : "div";
          return (
            <Reveal key={i} delay={i * 90}>
              <Tag className="contact-card" {...(c.href ? { href: c.href, target: "_blank", rel: "noopener noreferrer" } : {})}>
                <span className="promise-icon">
                  <c.icon />
                </span>
                <span className="mono dim">{c.title}</span>
                <strong>{c.main}</strong>
                <span className="muted">{c.sub}</span>
              </Tag>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

export function AboutFollow({ content, shop }) {
  if (!content.visible) return null;
  return (
    <section className="section-sm">
      <div className="wrap about-follow">
        <Reveal>
          {content.kicker && <p className="kicker">{content.kicker}</p>}
          <h2 className="h2">
            <Markup text={content.title} />
          </h2>
          <p className="lead">{content.lead}</p>
        </Reveal>
        <Reveal delay={100} className="about-follow-links">
          <a className="btn btn-ghost" href={shop.facebook} target="_blank" rel="noopener noreferrer">
            <Facebook /> Facebook
          </a>
          <a className="btn btn-ghost" href={shop.instagram} target="_blank" rel="noopener noreferrer">
            <Instagram /> Instagram
          </a>
          <a className="btn btn-primary" href={shop.whatsapp} target="_blank" rel="noopener noreferrer">
            <WhatsApp /> WhatsApp
          </a>
          <Link className="btn btn-ghost" to="/catalog">
            Shop now <Arrow />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
