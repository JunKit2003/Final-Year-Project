import { useEffect, useState } from "react";
import { Link } from "react-router";
import api, { assetUrl } from "../lib/api";
import { Reveal } from "../lib/motion";
import { shopStatus } from "../lib/shop";
import { Marquee, PageHead } from "../components/ui/Bits";
import { SHOP } from "../components/Footer";
import { Arrow, Clock, Facebook, Instagram, Phone, Pin, WhatsApp } from "../components/ui/Icons";

const BRANDS = ["Deity Components", "Trek Bikes", "Industry Nine", "Michelin", "OneUp Components", "CushCore", "Peaty's"];

export default function About() {
  const [photos, setPhotos] = useState([]);
  const status = shopStatus();
  useEffect(() => {
    api
      .post("/api/banner/get", {})
      .then((res) => setPhotos((res.data?.banners || []).map((b) => assetUrl(b.imageUrl))))
      .catch(() => setPhotos([]));
  }, []);

  return (
    <div className="page about">
      <PageHead kicker="Since 2022" lines={["Hello", "there."]} outline={[1]} lead="We're stoked you made it to our web store: easy access to all the great MTB brands we distribute and stock." />

      <section className="section-sm">
        <div className="wrap about-story">
          <Reveal className="about-photo">{photos[0] && <img src={photos[0]} alt="The Faction Bikeworks shop front" loading="lazy" />}</Reveal>
          <Reveal delay={120} className="about-copy">
            <p className="kicker">The mission</p>
            <h2 className="h2">
              Best-in-class <span className="hl">MTB parts</span>, from riders.
            </h2>
            <p className="lead">Since 2022, Faction&apos;s mission has been to deliver best-in-class MTB products to our customers. That has stayed true to this day.</p>
            <p className="muted">
              Better still, drop by our physical shop at the foothills of Bukit Kiara to get your questions answered in person, grab a post-ride drink, or arrange a test ride.
            </p>
            <p className="muted">
              Interested in something from our brands that isn&apos;t listed here? Message us about special orders. Happy trails.
            </p>
          </Reveal>
        </div>
      </section>

      <Marquee items={BRANDS} speed={30} />

      <section className="section">
        <div className="wrap contact-grid">
          {[
            { icon: Pin, title: "Find us", main: "Wisma WIM, TTDI", sub: SHOP.address, href: SHOP.maps },
            { icon: Phone, title: "Call or WhatsApp", main: SHOP.phone, sub: "Fastest way to reach us", href: SHOP.whatsapp },
            { icon: Clock, title: status.label, main: "Mon to Fri 11am to 7:30pm", sub: "Sat 11am to 4pm · Sun & PH closed, gone riding", href: null },
          ].map((c, i) => {
            const Tag = c.href ? "a" : "div";
            return (
              <Reveal key={c.title} delay={i * 90}>
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

      <section className="section-sm">
        <div className="wrap about-follow">
          <Reveal>
            <p className="kicker">Stay in the loop</p>
            <h2 className="h2">Follow the faction</h2>
            <p className="lead">Facebook and Instagram are the best way to hear about new products and promotions.</p>
          </Reveal>
          <Reveal delay={100} className="about-follow-links">
            <a className="btn btn-ghost" href={SHOP.facebook} target="_blank" rel="noopener noreferrer">
              <Facebook /> Facebook
            </a>
            <a className="btn btn-ghost" href={SHOP.instagram} target="_blank" rel="noopener noreferrer">
              <Instagram /> Instagram
            </a>
            <a className="btn btn-primary" href={SHOP.whatsapp} target="_blank" rel="noopener noreferrer">
              <WhatsApp /> WhatsApp
            </a>
            <Link className="btn btn-ghost" to="/catalog">
              Shop now <Arrow />
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
