import { Link } from "react-router";
import stripeBadge from "../assets/powered-by-stripe.png";
import { shopStatus } from "../../../shared/site-schema.js";
import { useSite } from "../lib/site";
import { Logo } from "./Header";
import { SmartLink } from "./ui/Markup";
import { ArrowUpRight, Facebook, Instagram, Torx, WhatsApp } from "./ui/Icons";
import { Magnetic } from "../lib/motion";

/** Footer body, driven by settings; the admin renders it as a preview too. */
export function FooterBody({ content, shop, hours, chatLabel }) {
  const status = shopStatus(hours);
  return (
    <footer className="footer topo">
      <div className="wrap">
        <div className="footer-hero">
          <p className="kicker">{shop.locationKicker}</p>
          <SmartLink to={content.bigLink} className="footer-huge">
            <span>{content.bigText}</span>
            <span className="footer-huge-go" aria-hidden>
              <ArrowUpRight />
            </span>
          </SmartLink>
        </div>

        <div className="footer-grid">
          <div className="footer-col footer-brand">
            <Logo />
            <p className="muted">{shop.tagline}</p>
            <div className="socials">
              {[
                [shop.whatsapp, WhatsApp, "WhatsApp"],
                [shop.facebook, Facebook, "Facebook"],
                [shop.instagram, Instagram, "Instagram"],
              ].map(([href, Icon, label]) => (
                <Magnetic key={label}>
                  <a className="icon-btn" href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
                    <Icon />
                  </a>
                </Magnetic>
              ))}
            </div>
          </div>

          <div className="footer-col">
            <h4>Shop</h4>
            <Link className="link" to="/catalog">All products</Link>
            <Link className="link" to="/cart">Cart</Link>
            <Link className="link" to="/orderHistory">My orders</Link>
            <Link className="link" to="/chatbot">{chatLabel}</Link>
          </div>

          <div className="footer-col">
            <h4>Visit</h4>
            <a className="link" href={shop.maps} target="_blank" rel="noopener noreferrer">
              {shop.address}
            </a>
            <a className="link" href={`tel:${shop.phone.replace(/[^+\d]/g, "")}`}>
              {shop.phone}
            </a>
          </div>

          <div className="footer-col">
            <h4>
              Hours <span className={`open-dot ${status.open ? "is-open" : ""}`} title={status.label} />
            </h4>
            {hours.display.map((h) => (
              <p key={h.day} className="hours-row">
                <span className="muted">{h.day}</span>
                <span>{h.time}</span>
              </p>
            ))}
          </div>
        </div>

        <div className="footer-bottom">
          <span className="footer-copy">
            <Torx className="footer-torx" /> © {new Date().getFullYear()} {shop.name}. {content.copyright}
          </span>
          <img src={stripeBadge} alt="Payments powered by Stripe" className="stripe-badge" height="26" />
        </div>
      </div>
    </footer>
  );
}

export default function Footer() {
  const site = useSite();
  return <FooterBody content={site["content.footer"]} shop={site.shop} hours={site.hours} chatLabel={site.chatbot.launcherLabel} />;
}
