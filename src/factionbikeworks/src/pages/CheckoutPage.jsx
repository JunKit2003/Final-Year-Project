import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import api from "../lib/api";
import { useProducts, useSession } from "../lib/store";
import { cartLineState, cartTotal, formatRM, indexVariations, lineTotal } from "../lib/shop";
import { Empty, Loader, PageHead, headLines } from "../components/ui/Bits";
import { useSite } from "../lib/site";
import { LineImage } from "./Cart";
import { ArrowLeft, Lock, Shield } from "../components/ui/Icons";

const FIELDS = [
  { id: "recipientName", label: "Recipient name", auto: "name", span: 2 },
  { id: "phoneNumber", label: "Phone number", auto: "tel", type: "tel", span: 2 },
  { id: "addressUnit", label: "Unit / house no.", auto: "address-line2" },
  { id: "addressStreet", label: "Street", auto: "address-line1" },
  { id: "addressPostalCode", label: "Postcode", auto: "postal-code", inputMode: "numeric" },
  { id: "addressCity", label: "City", auto: "address-level2" },
  { id: "addressState", label: "State", auto: "address-level1" },
  { id: "addressCountry", label: "Country", auto: "country-name" },
];

const parseSelected = (raw) => {
  try {
    const ids = JSON.parse(raw || "[]");
    return Array.isArray(ids) ? ids.map(Number).filter(Number.isFinite) : [];
  } catch {
    return [];
  }
};

export default function CheckoutPage() {
  const headings = useSite()["content.pages"];
  const { user, checking, cart } = useSession();
  const { products } = useProducts();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const ids = useMemo(() => parseSelected(params.get("selected")), [params]);
  const index = useMemo(() => indexVariations(products), [products]);
  const [form, setForm] = useState({ addressCountry: "Malaysia" });
  const [error, setError] = useState("");
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (!ids.length) navigate("/cart", { replace: true });
  }, [ids.length, navigate]);

  const items = cart.filter((i) => ids.includes(i.id) && cartLineState(i).ok);
  const total = cartTotal(items);

  if (checking) return <Loader label="Checking your session" />;
  if (!user) {
    return (
      <div className="wrap section">
        <Empty kicker="Checkout" title="Sign in to check out" action={<Link to="/login" state={{ from: "/cart" }} className="btn btn-primary">Sign in</Link>} />
      </div>
    );
  }
  if (!items.length) {
    return (
      <div className="wrap section">
        <Empty kicker="Checkout" title="Nothing to check out" action={<Link to="/cart" className="btn btn-primary">Back to cart</Link>}>
          The items you picked are no longer in your cart, or went out of stock.
        </Empty>
      </div>
    );
  }

  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const place = async (e) => {
    e.preventDefault();
    setError("");
    const missing = FIELDS.find((f) => !(form[f.id] || "").trim());
    if (missing) {
      setError(`Please fill in ${missing.label.toLowerCase()}.`);
      document.getElementById(missing.id)?.focus();
      return;
    }
    setPlacing(true);
    try {
      const shipping = `${form.addressUnit}, ${form.addressStreet}, ${form.addressPostalCode} ${form.addressCity}, ${form.addressState}, ${form.addressCountry}`;
      const res = await api.post("/api/cart/createOrder", {
        user_id: user.id,
        recipient_name: form.recipientName.trim(),
        shipping_address: shipping,
        phoneNumber: form.phoneNumber.trim(),
        items: items.map((i) => ({ variation_id: i.variation.id, quantity: i.quantity })),
        total_amount: total,
      });
      if (!res.data?.url) throw new Error("no-checkout-url");
      // Stripe-hosted Checkout. Comes back to /paymentSuccess or /paymentFailed.
      window.location.assign(res.data.url);
    } catch (err) {
      setError(err.response?.data?.message || "We couldn't start checkout. Please try again.");
      setPlacing(false);
    }
  };

  return (
    <div className="page checkout">
      <PageHead kicker={headings.checkout.kicker} lines={headLines(headings.checkout)} />
      <div className="wrap section-sm">
        <form className="checkout-grid" onSubmit={place} noValidate>
          <div className="checkout-form">
            <Link to="/cart" className="crumb-back mono">
              <ArrowLeft /> Back to cart
            </Link>
            <fieldset>
              <legend className="kicker">Delivery details</legend>
              <div className="form-grid">
                {FIELDS.map((f) => (
                  <div className={`field ${f.span === 2 ? "span-2" : ""}`} key={f.id}>
                    <input id={f.id} name={f.id} type={f.type || "text"} autoComplete={f.auto} inputMode={f.inputMode} value={form[f.id] || ""} onChange={set} placeholder=" " required />
                    <label htmlFor={f.id}>
                      {f.label} <span className="req">*</span>
                    </label>
                  </div>
                ))}
              </div>
            </fieldset>
            {error && (
              <div className="alert alert-error" role="alert">
                {error}
              </div>
            )}
          </div>

          <aside className="summary">
            <p className="kicker">Your order</p>
            <ul className="summary-lines">
              {items.map((i) => (
                <li key={i.id}>
                  <div className="summary-thumb">
                    <LineImage variationId={i.variation.id} productId={i.variation.product?.id} sku={i.variation.sku} index={index} />
                    <span className="summary-qty">{i.quantity}</span>
                  </div>
                  <span className="summary-name">
                    {i.variation.product?.name}
                    <small className="muted">{i.variation.name}</small>
                  </span>
                  <span>{formatRM(lineTotal(i))}</span>
                </li>
              ))}
            </ul>
            <p className="summary-total">
              <span>Total</span>
              <strong>{formatRM(total)}</strong>
            </p>
            <button type="submit" className="btn btn-primary btn-block" disabled={placing}>
              <Lock /> {placing ? "Opening Stripe…" : `Pay ${formatRM(total)}`}
            </button>
            <p className="summary-note muted">
              <Shield /> You&apos;ll pay on Stripe&apos;s secure page. We never see your card details.
            </p>
          </aside>
        </form>
      </div>
    </div>
  );
}
