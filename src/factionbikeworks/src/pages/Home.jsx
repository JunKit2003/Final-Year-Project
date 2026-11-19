import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import api, { assetUrl } from "../lib/api";
import { useProducts } from "../lib/store";
import { Counter, Magnetic, Reveal, reducedMotion } from "../lib/motion";
import { countBy, filterProducts, shopStatus } from "../lib/shop";
import ProductCard, { ProductCardSkeleton } from "../components/ProductCard";
import { Marquee } from "../components/ui/Bits";
import { SHOP } from "../components/Footer";
import { Arrow, ArrowUpRight, Clock, Phone, Pin, Shield, Truck, Wrench } from "../components/ui/Icons";

const MAP_SRC =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3983.815222182998!2d101.62756258489375!3d3.1434261450361616!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31cc495f03e40a99%3A0x50f6e08edd4ee8b8!2sFaction%20Bikeworks!5e0!3m2!1sen!2smy!4v1728336895257!5m2!1sen!2smy";

function useBanners() {
  const [banners, setBanners] = useState([]);
  useEffect(() => {
    api
      .post("/api/banner/get", {})
      .then((res) => setBanners((res.data?.banners || []).map((b) => assetUrl(b.imageUrl)).filter(Boolean)))
      .catch(() => setBanners([]));
  }, []);
  return banners;
}

function useBrands() {
  const [brands, setBrands] = useState([]);
  useEffect(() => {
    api
      .post("/api/product/getBrandImages", {})
      .then((res) => setBrands(res.data?.brands || []))
      .catch(() => setBrands([]));
  }, []);
  return brands;
}

/** Hero: banner photos crossfade with a slow push-in, headline sits on a diagonal cut. */
function Hero({ banners, productCount, brandCount }) {
  const [i, setI] = useState(0);
  const ref = useRef(null);
  const status = shopStatus();

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

  return (
    <section className="hero" ref={ref}>
      <div className="hero-media" aria-hidden>
        {banners.map((src, n) => (
          <img key={src + n} src={src} alt="" className={n === i ? "is-on" : ""} />
        ))}
        <div className="hero-shade" />
        <div className="hero-grid" />
      </div>

      <div className="wrap hero-inner">
        <div className="hero-top fade-up" style={{ animationDelay: "60ms" }}>
          <span className={`live ${status.open ? "is-open" : ""}`}>
            <i /> Shop {status.label.toLowerCase()}
          </span>
          <span className="mono dim">3.1434° N, 101.6276° E</span>
        </div>

        <h1 className="display hero-title">
          <span className="line">
            <span style={{ animationDelay: "120ms" }}>Built for</span>
          </span>
          <span className="line">
            <span style={{ animationDelay: "230ms" }}>
              <span className="outline">Kiara</span> dirt<span className="accent">.</span>
            </span>
          </span>
        </h1>

        <div className="hero-foot">
          <p className="lead fade-up" style={{ animationDelay: "520ms" }}>
            Deity, Industry Nine, Michelin, OneUp, CushCore, Peaty&apos;s and Trek. Best-in-class MTB parts, picked and wrenched by riders at the foot of Bukit Kiara.
          </p>
          <div className="hero-ctas fade-up" style={{ animationDelay: "640ms" }}>
            <Magnetic>
              <Link to="/catalog" className="btn btn-primary">
                Shop the parts <Arrow />
              </Link>
            </Magnetic>
            <Magnetic>
              <a href="#visit" className="btn btn-ghost">
                Visit the shop
              </a>
            </Magnetic>
          </div>
        </div>

        <div className="hero-stats fade-up" style={{ animationDelay: "780ms" }}>
          <div>
            <strong>{productCount || "··"}</strong>
            <span className="mono">Products</span>
          </div>
          <div>
            <strong>{brandCount || "··"}</strong>
            <span className="mono">Brands</span>
          </div>
          <div>
            <strong>2022</strong>
            <span className="mono">Since</span>
          </div>
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

export default function Home() {
  const { products, loading } = useProducts();
  const banners = useBanners();
  const brands = useBrands();

  const fresh = useMemo(() => filterProducts(products, { sort: "featured", inStock: true }).slice(0, 8), [products]);
  const categories = useMemo(() => countBy(products, "category").sort((a, b) => b.count - a.count).slice(0, 6), [products]);
  const brandNames = brands.length ? brands.map((b) => b.brandName) : countBy(products, "brand").map((b) => b.name);
  const status = shopStatus();

  return (
    <div className="page home">
      <Hero banners={banners} productCount={products.length} brandCount={brandNames.length} />

      <Marquee items={brandNames.length ? brandNames : ["Deity", "Industry Nine", "Michelin", "OneUp", "CushCore", "Peaty's", "Trek"]} />

      {/* -------- Brands wall -------- */}
      {brands.length > 0 && (
        <section className="section-sm">
          <div className="wrap">
            <div className="section-head">
              <Reveal>
                <p className="kicker">Shop by brand</p>
                <h2 className="h2">
                  The good <span className="outline">stuff.</span>
                </h2>
              </Reveal>
              <Reveal delay={100}>
                <Link to="/catalog" className="btn btn-ghost btn-sm">
                  All brands <Arrow />
                </Link>
              </Reveal>
            </div>
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
      )}

      {/* -------- Fresh in -------- */}
      <section className="section-sm">
        <div className="wrap">
          <div className="section-head">
            <Reveal>
              <p className="kicker">In stock now</p>
              <h2 className="h2">Fresh off the truck</h2>
            </Reveal>
            <Reveal delay={100}>
              <Link to="/catalog" className="btn btn-ghost btn-sm">
                Shop everything <Arrow />
              </Link>
            </Reveal>
          </div>
          <div className="product-grid">
            {loading ? Array.from({ length: 4 }, (_, n) => <ProductCardSkeleton key={n} />) : fresh.map((p, n) => <ProductCard key={p.id} product={p} index={n} />)}
          </div>
        </div>
      </section>

      {/* -------- Categories -------- */}
      {categories.length > 0 && (
        <section className="section-sm">
          <div className="wrap">
            <div className="section-head">
              <Reveal>
                <p className="kicker">Shop by part</p>
                <h2 className="h2">What needs upgrading?</h2>
              </Reveal>
            </div>
            <div className="cat-grid">
              {categories.map((c, n) => (
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
      )}

      {/* -------- Promise strip -------- */}
      <section className="section-sm">
        <div className="wrap promise">
          {[
            [Wrench, "Rider-run workshop", "Every part is something we ride, fit and stand behind."],
            [Shield, "Secure checkout", "Card payments handled end to end by Stripe."],
            [Truck, "Ships across Malaysia", "Or pick up at the shop and grab a post-ride drink."],
          ].map(([Icon, t, d], n) => (
            <Reveal key={t} delay={n * 90} className="promise-item">
              <span className="promise-icon">
                <Icon />
              </span>
              <div>
                <h3 className="h3">{t}</h3>
                <p className="muted">{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* -------- Numbers -------- */}
      <section className="section-sm numbers">
        <div className="wrap numbers-grid">
          {[
            { to: products.length, l: "Products on the shelf" },
            { to: brandNames.length, l: "Brands we distribute" },
            { to: new Date().getFullYear() - 2022, s: " yrs", l: "Keeping Kiara rolling" },
          ].map((n, k) => (
            <Reveal key={n.l} delay={k * 80} className="number">
              <strong>
                <Counter to={n.to} suffix={n.s || ""} />
              </strong>
              <span className="muted">{n.l}</span>
            </Reveal>
          ))}
        </div>
      </section>

      {/* -------- Visit -------- */}
      <section className="section visit" id="visit">
        <div className="wrap visit-grid">
          <Reveal className="visit-copy">
            <p className="kicker">Come say hi</p>
            <h2 className="h2">
              Foot of <span className="hl">Bukit Kiara</span>
            </h2>
            <p className="lead">Questions answered in person, test rides arranged, and a cold drink after your loop. Special orders welcome.</p>
            <ul className="visit-list">
              <li>
                <Pin />
                <a className="link" href={SHOP.maps} target="_blank" rel="noopener noreferrer">
                  {SHOP.address}
                </a>
              </li>
              <li>
                <Phone />
                <a className="link" href={SHOP.whatsapp} target="_blank" rel="noopener noreferrer">
                  {SHOP.phone} (WhatsApp)
                </a>
              </li>
              <li>
                <Clock />
                <span>
                  <span className={`live ${status.open ? "is-open" : ""}`}>
                    <i /> {status.label}
                  </span>
                  {SHOP.hours.map(([d, h]) => (
                    <span key={d} className="visit-hours">
                      <span className="muted">{d}</span> {h}
                    </span>
                  ))}
                </span>
              </li>
            </ul>
          </Reveal>
          <Reveal delay={120} className="visit-map">
            <iframe title="Map to Faction Bikeworks" src={MAP_SRC} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" />
          </Reveal>
        </div>
      </section>
    </div>
  );
}
