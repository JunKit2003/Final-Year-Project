// Home page sections. Each takes its settings group as `content` (plus live data) and
// renders nothing when hidden, so the admin can render the same component as a preview.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { assetUrl } from "../../lib/api";
import { Counter, Magnetic, Reveal, reducedMotion } from "../../lib/motion";
import { shopStatus } from "../../../../shared/site-schema.js";
import ProductCard, { ProductCardSkeleton } from "../ProductCard";
import { Marquee } from "../ui/Bits";
import { Markup, SmartLink } from "../ui/Markup";
import { Arrow, ArrowUpRight, Chat, Clock, Lock, Package, Phone, Pin, Shield, Truck, Wrench } from "../ui/Icons";

export const PROMISE_ICONS = { wrench: Wrench, shield: Shield, truck: Truck, package: Package, lock: Lock, clock: Clock, pin: Pin, phone: Phone, chat: Chat };

/** Hero: banner photos crossfade with a slow push-in, headline sits on a diagonal cut. */
export function HomeHero({ content, shop, hours, banners = [], productCount, brandCount }) {
  const [i, setI] = useState(0);
  const ref = useRef(null);
  const status = shopStatus(hours);

  useEffect(() => {
    if (banners.length < 2 || reducedMotion()) return undefined;
    const t = setInterval(() => setI((n) => (n + 1) % banners.length), 5200);
    return () => clearInterval(t);
  }, [banners.length]);

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return undefined;
    let raf;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => el.style.setProperty("--sy", `${Math.min(window.scrollY, 900)}px`));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (!content.visible) return null;
  const current = banners[i];

  return (
    <section className="hero" ref={ref}>
      <div className="hero-media" aria-hidden={!current?.alt}>
        {banners.map((b, n) => (
          <img key={b.src + n} src={b.src} alt={n === i ? b.alt || "" : ""} className={n === i ? "is-on" : ""} />
        ))}
        <div className="hero-shade" />
        <div className="hero-grid" />
        {current?.linkUrl && <SmartLink to={current.linkUrl} className="hero-banner-link" aria-label={current.alt || "Open banner"} />}
      </div>

      <div className="wrap hero-inner">
        <div className="hero-top fade-up" style={{ animationDelay: "60ms" }}>
          <span className={`live ${status.open ? "is-open" : ""}`}>
            <i /> Shop {status.label.toLowerCase()}
          </span>
          {content.showCoordinates && shop.coordinates && <span className="mono dim">{shop.coordinates}</span>}
        </div>

        <h1 className="display hero-title">
          {content.lines.map((l, n) => (
            <span className="line" key={n}>
              <span style={{ animationDelay: `${120 + n * 110}ms` }}>
                <Markup text={l.value} />
              </span>
            </span>
          ))}
        </h1>

        <div className="hero-foot">
          <p className="lead fade-up" style={{ animationDelay: "520ms" }}>
            {content.lead}
          </p>
          <div className="hero-ctas fade-up" style={{ animationDelay: "640ms" }}>
            <Magnetic>
              <SmartLink to={content.primaryCta.link} className="btn btn-primary">
                {content.primaryCta.label} <Arrow />
              </SmartLink>
            </Magnetic>
            <Magnetic>
              <SmartLink to={content.secondaryCta.link} className="btn btn-ghost">
                {content.secondaryCta.label}
              </SmartLink>
            </Magnetic>
          </div>
        </div>

        <div className="hero-stats fade-up" style={{ animationDelay: "780ms" }}>
          {content.showStats && (
            <>
              <div>
                <strong>{productCount || "··"}</strong>
                <span className="mono">Products</span>
              </div>
              <div>
                <strong>{brandCount || "··"}</strong>
                <span className="mono">Brands</span>
              </div>
              <div>
                <strong>{shop.foundedYear}</strong>
                <span className="mono">Since</span>
              </div>
            </>
          )}
          {banners.length > 1 && (
            <div className="hero-dots" role="tablist" aria-label="Banner">
              {banners.map((_, n) => (
                <button key={n} type="button" className={n === i ? "is-on" : ""} onClick={() => setI(n)} aria-label={`Show banner ${n + 1}`} role="tab" aria-selected={n === i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function BrandMarquee({ content, names }) {
  if (!content.visible || !content.showMarquee || !names.length) return null;
  return <Marquee items={names} />;
}

function SectionHead({ kicker, title, children }) {
  return (
    <div className="section-head">
      <Reveal>
        {kicker && <p className="kicker">{kicker}</p>}
        <h2 className="h2">
          <Markup text={title} />
        </h2>
      </Reveal>
      {children && <Reveal delay={100}>{children}</Reveal>}
    </div>
  );
}

export function BrandWall({ content, brands = [] }) {
  if (!content.visible || brands.length === 0) return null;
  return (
    <section className="section-sm">
      <div className="wrap">
        <SectionHead kicker={content.kicker} title={content.title}>
          <Link to="/catalog" className="btn btn-ghost btn-sm">
            {content.ctaLabel} <Arrow />
          </Link>
        </SectionHead>
        <div className="brand-wall">
          {brands.map((b, n) => (
            <Reveal key={b.id || b.brandName} delay={(n % 6) * 50}>
              <Link to={`/catalog/${encodeURIComponent(b.brandName)}`} className="brand-tile">
                {b.imageUrl ? <img src={assetUrl(b.imageUrl)} alt={b.brandName} loading="lazy" /> : <span>{b.brandName}</span>}
                <span className="brand-tile-name mono">
                  {b.brandName} <ArrowUpRight />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FreshIn({ content, products = [], loading }) {
  if (!content.visible) return null;
  return (
    <section className="section-sm">
      <div className="wrap">
        <SectionHead kicker={content.kicker} title={content.title}>
          <Link to="/catalog" className="btn btn-ghost btn-sm">
            {content.ctaLabel} <Arrow />
          </Link>
        </SectionHead>
        <div className="product-grid">
          {loading ? Array.from({ length: 4 }, (_, n) => <ProductCardSkeleton key={n} />) : products.slice(0, content.count).map((p, n) => <ProductCard key={p.id} product={p} index={n} />)}
        </div>
      </div>
    </section>
  );
}

export function CategoryGrid({ content, categories = [] }) {
  if (!content.visible || categories.length === 0) return null;
  return (
    <section className="section-sm">
      <div className="wrap">
        <SectionHead kicker={content.kicker} title={content.title} />
        <div className="cat-grid">
          {categories.slice(0, content.count).map((c, n) => (
            <Reveal key={c.name} delay={n * 60}>
              <Link to={`/catalog?category=${encodeURIComponent(c.name)}`} className="cat-tile topo">
                <span className="cat-num mono">{String(n + 1).padStart(2, "0")}</span>
                <span className="cat-name">{c.name}</span>
                <span className="cat-count mono">
                  {c.count} {c.count === 1 ? "product" : "products"} <Arrow />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PromiseStrip({ content }) {
  if (!content.visible || !content.items.length) return null;
  return (
    <section className="section-sm">
      <div className="wrap promise">
        {content.items.map((item, n) => {
          const Icon = PROMISE_ICONS[item.icon] || Wrench;
          return (
            <Reveal key={`${item.title}${n}`} delay={n * 90} className="promise-item">
              <span className="promise-icon">
                <Icon />
              </span>
              <div>
                <h3 className="h3">{item.title}</h3>
                <p className="muted">{item.text}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

export function Numbers({ content, shop, productCount, brandCount }) {
  if (!content.visible) return null;
  const suffix = content.yearsSuffix ? ` ${content.yearsSuffix}` : "";
  const items = [
    { to: productCount, l: content.productsLabel },
    { to: brandCount, l: content.brandsLabel },
    { to: Math.max(0, new Date().getFullYear() - shop.foundedYear), s: suffix, l: content.yearsLabel },
  ];
  return (
    <section className="section-sm numbers">
      <div className="wrap numbers-grid">
        {items.map((n, k) => (
          <Reveal key={k} delay={k * 80} className="number">
            <strong>
              <Counter to={n.to} suffix={n.s || ""} />
            </strong>
            <span className="muted">{n.l}</span>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function Visit({ content, shop, hours }) {
  if (!content.visible) return null;
  const status = shopStatus(hours);
  return (
    <section className="section visit" id="visit">
      <div className={`wrap visit-grid ${content.showMap ? "" : "visit-grid--solo"}`}>
        <Reveal className="visit-copy">
          {content.kicker && <p className="kicker">{content.kicker}</p>}
          <h2 className="h2">
            <Markup text={content.title} />
          </h2>
          <p className="lead">{content.lead}</p>
          <ul className="visit-list">
            <li>
              <Pin />
              <a className="link" href={shop.maps} target="_blank" rel="noopener noreferrer">
                {shop.address}
              </a>
            </li>
            <li>
              <Phone />
              <a className="link" href={shop.whatsapp} target="_blank" rel="noopener noreferrer">
                {shop.phone} (WhatsApp)
              </a>
            </li>
            <li>
              <Clock />
              <span>
                <span className={`live ${status.open ? "is-open" : ""}`}>
                  <i /> {status.label}
                </span>
                {hours.display.map((h) => (
                  <span key={h.day} className="visit-hours">
                    <span className="muted">{h.day}</span> {h.time}
                  </span>
                ))}
              </span>
            </li>
          </ul>
        </Reveal>
        {content.showMap && (
          <Reveal delay={120} className="visit-map">
            <iframe title={`Map to ${shop.name}`} src={shop.mapEmbed} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" />
          </Reveal>
        )}
      </div>
    </section>
  );
}
