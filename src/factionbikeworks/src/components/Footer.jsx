import { Link } from "react-router";
import stripeBadge from "../assets/powered-by-stripe.png";
import { shopStatus } from "../lib/shop";
import { Logo } from "./Header";
import { ArrowUpRight, Facebook, Instagram, Torx, WhatsApp } from "./ui/Icons";
import { Magnetic } from "../lib/motion";

export const SHOP = {
  phone: "+6011-3332 1767",
  whatsapp: "https://wa.me/601133321767",
  facebook: "https://www.facebook.com/faction.my/",
  instagram: "https://www.instagram.com/faction.my/",
  address: "G-8, Wisma WIM, Jln Abang Haji Openg, Taman Tun Dr Ismail, 60000 Kuala Lumpur",
  maps: "https://maps.google.com/?q=Faction+Bikeworks+Wisma+WIM",
  hours: [
    ["Mon to Fri", "11:00am to 7:30pm"],
    ["Saturday", "11:00am to 4:00pm"],
    ["Sun & PH", "Closed, gone riding"],
  ],
};

export default function Footer() {
  const status = shopStatus();
  return (
    <footer className="footer topo">
      <div className="wrap">
        <div className="footer-hero">
          <p className="kicker">Bukit Kiara, Kuala Lumpur</p>
          <Link to="/catalog" className="footer-huge">
            <span>Get dialled.</span>
            <span className="footer-huge-go" aria-hidden>
              <ArrowUpRight />
            </span>
          </Link>
        </div>

        <div className="footer-grid">
          <div className="footer-col footer-brand">
            <Logo />
            <p className="muted">Best-in-class MTB components since 2022. Drop by the shop at the foot of Bukit Kiara for advice, a test ride or a post-ride drink.</p>
            <div className="socials">
              {[
                [SHOP.whatsapp, WhatsApp, "WhatsApp"],
                [SHOP.facebook, Facebook, "Facebook"],
                [SHOP.instagram, Instagram, "Instagram"],
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
            <Link className="link" to="/chatbot">Ask the mechanic</Link>
          </div>

          <div className="footer-col">
            <h4>Visit</h4>
            <a className="link" href={SHOP.maps} target="_blank" rel="noopener noreferrer">
              {SHOP.address}
            </a>
            <a className="link" href={`tel:${SHOP.phone.replace(/[^+\d]/g, "")}`}>
              {SHOP.phone}
            </a>
          </div>

          <div className="footer-col">
            <h4>
              Hours <span className={`open-dot ${status.open ? "is-open" : ""}`} title={status.label} />
            </h4>
            {SHOP.hours.map(([d, h]) => (
              <p key={d} className="hours-row">
                <span className="muted">{d}</span>
                <span>{h}</span>
              </p>
            ))}
          </div>
        </div>

        <div className="footer-bottom">
          <span className="footer-copy">
            <Torx className="footer-torx" /> © {new Date().getFullYear()} Faction Bikeworks. Happy trails.
          </span>
          <img src={stripeBadge} alt="Payments powered by Stripe" className="stripe-badge" height="26" />
        </div>
      </div>
    </footer>
  );
}
