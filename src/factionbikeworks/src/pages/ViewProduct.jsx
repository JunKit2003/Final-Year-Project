import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import api, { assetUrl } from "../lib/api";
import { useProducts, useSession, useToast } from "../lib/store";
import { Reveal } from "../lib/motion";
import { formatRM, relatedProducts, stockState, toNumber } from "../lib/shop";
import ProductCard from "../components/ProductCard";
import { Loader } from "../components/ui/Bits";
import { ArrowLeft, Bag, ChevronLeft, ChevronRight, Minus, Plus, Shield, Torx, Truck, WhatsApp } from "../components/ui/Icons";
import { SHOP } from "../components/Footer";

function Gallery({ images, title }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(false);
  const stage = useRef(null);
  const touch = useRef(null);
  const n = images.length;

  const go = (d) => setI((x) => (x + d + n) % n);

  const onMove = (e) => {
    const r = stage.current.getBoundingClientRect();
    stage.current.style.setProperty("--zx", `${((e.clientX - r.left) / r.width) * 100}%`);
    stage.current.style.setProperty("--zy", `${((e.clientY - r.top) / r.height) * 100}%`);
  };

  if (!n) {
    return (
      <div className="gallery">
        <div className="gallery-stage gallery-stage--empty">
          <Torx />
        </div>
      </div>
    );
  }

  return (
    <div className="gallery">
      <div
        ref={stage}
        className={`gallery-stage ${zoom ? "is-zoom" : ""}`}
        onPointerEnter={(e) => e.pointerType === "mouse" && setZoom(true)}
        onPointerLeave={() => setZoom(false)}
        onPointerMove={onMove}
        onTouchStart={(e) => {
          touch.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - (touch.current ?? 0);
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        }}
      >
        {images.map((src, k) => (
          <img key={src} src={src} alt={k === i ? title : ""} className={k === i ? "is-on" : ""} loading={k < 2 ? "eager" : "lazy"} />
        ))}
        {n > 1 && (
          <>
            <button type="button" className="icon-btn gallery-nav gallery-prev" onClick={() => go(-1)} aria-label="Previous photo">
              <ChevronLeft />
            </button>
            <button type="button" className="icon-btn gallery-nav gallery-next" onClick={() => go(1)} aria-label="Next photo">
              <ChevronRight />
            </button>
            <span className="gallery-count mono">
              {String(i + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
            </span>
          </>
        )}
      </div>
      {n > 1 && (
        <div className="gallery-thumbs">
          {images.map((src, k) => (
            <button type="button" key={src} className={k === i ? "is-on" : ""} onClick={() => setI(k)} aria-label={`Photo ${k + 1}`}>
              <img src={src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Remount per product so state (variation, qty, loaded product) starts fresh without effects.
export default function ViewProductRoute() {
  const { productId } = useParams();
  return <ViewProduct key={productId} productId={productId} />;
}

function ViewProduct({ productId }) {
  const { user, addToCart } = useSession();
  const { products } = useProducts();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState(null);
  const [vi, setVi] = useState(0);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let live = true;
    api
      .post("/api/product/get", { productId })
      .then((res) => live && (res.data?.product ? setProduct(res.data.product) : setError("We couldn't find that product.")))
      .catch((e) => live && setError(e.response?.status === 404 ? "We couldn't find that product." : "We couldn't load this product."));
    return () => {
      live = false;
    };
  }, [productId]);

  useEffect(() => {
    if (product) document.title = `${product.name} · ${product.brand} · Faction Bikeworks`;
  }, [product]);

  const variations = useMemo(() => product?.variations || [], [product]);
  const v = useMemo(() => variations[vi] || {}, [variations, vi]);
  const stock = Number(v.stock) || 0;
  const state = stockState(stock);
  const images = useMemo(() => (v.images?.files || []).map(assetUrl), [v]);
  const related = useMemo(() => relatedProducts(products, product), [products, product]);

  // Keep the chosen quantity inside the selected option's stock.
  const qtyShown = Math.max(1, Math.min(qty, stock || 1));

  if (error) {
    return (
      <div className="center-screen page">
        <p className="kicker">404 / wrong trail</p>
        <h1 className="h2">{error}</h1>
        <Link to="/catalog" className="btn btn-primary">
          Back to the shop
        </Link>
      </div>
    );
  }
  if (!product) return <Loader label="Loading product" />;

  const onAdd = async () => {
    if (!user) {
      toast("Sign in to add parts to your cart.", "ok");
      navigate("/login", { state: { from: location.pathname } });
      return;
    }
    setAdding(true);
    try {
      await addToCart(v.id, qtyShown);
      toast(
        `${qtyShown} × ${product.name} added`,
        "ok",
        <Link to="/cart">View cart</Link>
      );
    } catch {
      toast("Couldn't add that to your cart. Try again.", "error");
    } finally {
      setAdding(false);
    }
  };

  const wa = encodeURIComponent(`Hi Faction, is the ${product.brand} ${product.name} (${v.name || v.sku}) available? ${window.location.href}`);

  return (
    <div className="page pdp">
      <div className="wrap">
        <nav className="crumbs mono" aria-label="Breadcrumb">
          <Link to="/catalog" className="crumb-back">
            <ArrowLeft /> Shop
          </Link>
          <span>/</span>
          <Link to={`/catalog/${encodeURIComponent(product.brand)}`}>{product.brand}</Link>
          <span>/</span>
          <span className="dim">{product.category}</span>
        </nav>

        <div className="pdp-grid">
          <Gallery key={v.id ?? vi} images={images} title={`${product.name} ${v.name || ""}`} />

          <div className="pdp-info">
            <p className="kicker fade-up">{product.brand}</p>
            <h1 className="pdp-title">
              <span className="line">
                <span>{product.name}</span>
              </span>
            </h1>

            <div className="pdp-price-row fade-up" style={{ animationDelay: "150ms" }}>
              <span className="pdp-price">{formatRM(v.price)}</span>
              <span className={`tag tag--${state.key}`}>
                <i /> {state.label}
              </span>
            </div>

            {variations.length > 1 && (
              <div className="pdp-block fade-up" style={{ animationDelay: "220ms" }}>
                <p className="pdp-label mono">
                  Option <span className="dim">{v.name}</span>
                </p>
                <div className="variants" role="radiogroup" aria-label="Options">
                  {variations.map((opt, k) => {
                    const thumb = assetUrl(opt.images?.files?.[0]);
                    return (
                      <button
                        type="button"
                        key={opt.id}
                        role="radio"
                        aria-checked={k === vi}
                        className={`variant ${k === vi ? "is-on" : ""} ${Number(opt.stock) <= 0 ? "is-out" : ""}`}
                        onClick={() => setVi(k)}
                      >
                        {thumb ? <img src={thumb} alt="" /> : <span className="variant-dot" />}
                        <span className="variant-text">
                          <strong>{opt.name}</strong>
                          <small className="mono">{formatRM(opt.price)}</small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pdp-block fade-up" style={{ animationDelay: "290ms" }}>
              <div className="stock-meter" aria-hidden>
                <span style={{ width: `${Math.min(100, (stock / 10) * 100)}%` }} className={`is-${state.key}`} />
              </div>
              <div className="buy-row">
                <div className="qty" aria-label="Quantity">
                  <button type="button" onClick={() => setQty(Math.max(1, qtyShown - 1))} disabled={qtyShown <= 1 || stock <= 0} aria-label="Decrease quantity">
                    <Minus />
                  </button>
                  <span aria-live="polite">{qtyShown}</span>
                  <button type="button" onClick={() => setQty(Math.min(stock, qtyShown + 1))} disabled={qtyShown >= stock} aria-label="Increase quantity">
                    <Plus />
                  </button>
                </div>
                <button type="button" className="btn btn-primary buy-btn" onClick={onAdd} disabled={stock <= 0 || adding}>
                  <Bag /> {stock <= 0 ? "Out of stock" : adding ? "Adding…" : `Add to cart · ${formatRM(toNumber(v.price) * qtyShown)}`}
                </button>
              </div>
              <a className="btn btn-ghost btn-block" href={`${SHOP.whatsapp}?text=${wa}`} target="_blank" rel="noopener noreferrer">
                <WhatsApp /> Ask about this part
              </a>
            </div>

            <dl className="specs fade-up" style={{ animationDelay: "360ms" }}>
              <div>
                <dt className="mono">Brand</dt>
                <dd>{product.brand}</dd>
              </div>
              <div>
                <dt className="mono">Category</dt>
                <dd>{product.category}</dd>
              </div>
              {v.intendedUse && (
                <div>
                  <dt className="mono">Intended use</dt>
                  <dd>{v.intendedUse}</dd>
                </div>
              )}
              {v.sku && (
                <div>
                  <dt className="mono">SKU</dt>
                  <dd className="mono">{v.sku}</dd>
                </div>
              )}
            </dl>

            {product.description && (
              <div className="pdp-desc">
                <p className="pdp-label mono">About this part</p>
                <p>{product.description}</p>
              </div>
            )}

            <ul className="pdp-perks">
              <li>
                <Shield /> Secure card checkout with Stripe
              </li>
              <li>
                <Truck /> Ships across Malaysia, or collect at the shop
              </li>
            </ul>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="section-sm">
          <div className="wrap">
            <div className="section-head">
              <Reveal>
                <p className="kicker">Pairs well with</p>
                <h2 className="h2">More from the shelf</h2>
              </Reveal>
            </div>
            <div className="product-grid">
              {related.map((p, n) => (
                <ProductCard key={p.id} product={p} index={n} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
