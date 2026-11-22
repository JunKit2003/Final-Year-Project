import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { assetUrl } from "../lib/api";
import { useProducts, useSession, useToast } from "../lib/store";
import { cartLineState, cartTotal, formatRM, indexVariations, lineTotal } from "../lib/shop";
import { Check, Empty, Loader, PageHead, headLines } from "../components/ui/Bits";
import { useSite } from "../lib/site";
import { Arrow, Lock, Torx, Trash } from "../components/ui/Icons";

export function LineImage({ variationId, productId, sku, index }) {
  const hit = index.get(variationId);
  const src = assetUrl(hit?.variation?.images?.files?.[0]) || (productId && sku ? assetUrl(`/images/product_images/${productId}/${sku}/image_1.jpg`) : null);
  const [failed, setFailed] = useState(false);
  return (
    <div className="line-img">
      {src && !failed ? <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} /> : <Torx />}
    </div>
  );
}

export default function Cart() {
  const headings = useSite()["content.pages"];
  const { user, checking, cart, refreshCart, removeFromCart } = useSession();
  const { products } = useProducts();
  const toast = useToast();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const [removing, setRemoving] = useState(null);
  const index = useMemo(() => indexVariations(products), [products]);

  useEffect(() => {
    if (user) refreshCart(user);
    // Refresh once on entry so stock warnings are current.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const buyable = useMemo(() => cart.filter((i) => cartLineState(i).ok).map((i) => i.id), [cart]);
  // Default: everything that can be bought is selected.
  const picked = (selected ?? buyable).filter((id) => buyable.includes(id));
  const subtotal = cartTotal(cart, picked);
  const allOn = buyable.length > 0 && picked.length === buyable.length;

  if (checking) return <Loader label="Checking your session" />;

  if (!user) {
    return (
      <div className="page">
        <PageHead kicker="Cart" lines={headLines(headings.cart)} />
        <div className="wrap section-sm">
          <Empty kicker="Signed out" title="Sign in to see your cart" action={<Link to="/login" state={{ from: "/cart" }} className="btn btn-primary">Sign in <Arrow /></Link>}>
            Your cart is saved to your account, so it follows you from phone to laptop.
          </Empty>
        </div>
      </div>
    );
  }

  const toggle = (id) => setSelected(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);

  const remove = async (item) => {
    setRemoving(item.id);
    try {
      await removeFromCart(item.id);
      toast(`Removed ${item.variation?.product?.name || "item"}`);
    } catch {
      toast("Couldn't remove that item.", "error");
    } finally {
      setRemoving(null);
    }
  };

  const checkout = () => navigate(`/checkoutPage?selected=${encodeURIComponent(JSON.stringify(picked))}`);

  return (
    <div className="page cart">
      <PageHead kicker={`${cart.length} ${cart.length === 1 ? "line" : "lines"}`} lines={headLines(headings.cart)} />

      <div className="wrap section-sm">
        {cart.length === 0 ? (
          <Empty kicker="Empty" title="Nothing in the bag yet" action={<Link to="/catalog" className="btn btn-primary">Shop parts <Arrow /></Link>}>
            Fresh rubber, new pedals, a hub that sings. You know you want to.
          </Empty>
        ) : (
          <div className="cart-grid">
            <div className="cart-lines">
              <div className="cart-lines-head">
                <label className="select-all">
                  <Check checked={allOn} onChange={() => setSelected(allOn ? [] : buyable)} disabled={!buyable.length} label="Select all" />
                  <span>Select all</span>
                </label>
                <span className="mono dim">{picked.length} selected</span>
              </div>

              {cart.map((item) => {
                const v = item.variation || {};
                const p = v.product || {};
                const state = cartLineState(item);
                return (
                  <article key={item.id} className={`cart-line ${state.ok ? "" : "is-blocked"} ${removing === item.id ? "is-removing" : ""}`}>
                    <Check checked={picked.includes(item.id)} onChange={() => toggle(item.id)} disabled={!state.ok} label={`Select ${p.name}`} />
                    <Link to={`/viewProduct/${p.id}`} className="cart-line-img">
                      <LineImage variationId={v.id} productId={p.id} sku={v.sku} index={index} />
                    </Link>
                    <div className="cart-line-info">
                      <span className="mono dim">{p.brand}</span>
                      <Link to={`/viewProduct/${p.id}`} className="cart-line-name">
                        {p.name || "Product"}
                      </Link>
                      <span className="muted">
                        {v.name} · {formatRM(v.price)} × {item.quantity}
                      </span>
                      {!state.ok && <span className="tag tag--out">{state.reason}</span>}
                    </div>
                    <div className="cart-line-end">
                      <strong>{formatRM(lineTotal(item))}</strong>
                      <button type="button" className="icon-btn" onClick={() => remove(item)} aria-label={`Remove ${p.name}`} disabled={removing === item.id}>
                        <Trash />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <aside className="summary">
              <p className="kicker">Summary</p>
              <div className="summary-rows">
                <p>
                  <span className="muted">Items selected</span>
                  <span>{cart.filter((i) => picked.includes(i.id)).reduce((n, i) => n + Number(i.quantity), 0)}</span>
                </p>
                <p>
                  <span className="muted">Shipping</span>
                  <span className="muted">Arranged after payment</span>
                </p>
              </div>
              <p className="summary-total">
                <span>Subtotal</span>
                <strong>{formatRM(subtotal)}</strong>
              </p>
              <button type="button" className="btn btn-primary btn-block" onClick={checkout} disabled={!picked.length}>
                <Lock /> Checkout
              </button>
              <Link to="/catalog" className="btn btn-ghost btn-block">
                Keep shopping
              </Link>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
