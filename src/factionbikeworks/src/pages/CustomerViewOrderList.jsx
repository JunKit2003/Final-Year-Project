import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import api from "../lib/api";
import { useProducts, useSession } from "../lib/store";
import { ORDER_STEPS, formatRM, indexVariations, orderProgress, toNumber } from "../lib/shop";
import { Empty, Loader } from "../components/ui/Bits";
import { LineImage } from "./Cart";
import { orderDate } from "./OrderHistory";
import { ArrowLeft, Check, Close, Package, Phone, Pin, User, WhatsApp } from "../components/ui/Icons";
import { SHOP } from "../components/Footer";

export default function CustomerViewOrderList() {
  const { uid, orderId } = useParams();
  const { user, checking } = useSession();
  const { products } = useProducts();
  const index = useMemo(() => indexVariations(products), [products]);
  const [order, setOrder] = useState(null);
  const [loadError, setError] = useState("");
  const forbidden = user && String(user.id) !== String(uid) && user.category !== "Admin";
  const error = forbidden ? "You don't have permission to view this order." : loadError;

  useEffect(() => {
    if (!user || forbidden) return;
    api
      .post("/api/cart/getCustomerOrder", { orderId: Number(orderId), userId: user.id })
      .then((res) => (res.data?.order ? setOrder(res.data.order) : setError("Order not found.")))
      .catch(() => setError("We couldn't load this order."));
  }, [user, forbidden, orderId]);

  if (checking || (user && !order && !error)) return <Loader label="Loading order" />;
  if (!user) {
    return (
      <div className="wrap section">
        <Empty kicker="Order" title="Sign in to view this order" action={<Link to="/login" className="btn btn-primary">Sign in</Link>} />
      </div>
    );
  }
  if (error) {
    return (
      <div className="wrap section">
        <Empty kicker="Order" title={error} action={<Link to="/orderHistory" className="btn btn-primary">My orders</Link>} />
      </div>
    );
  }

  const step = orderProgress(order.status);
  const cancelled = step === -1;
  const items = order.items || [];
  const wa = encodeURIComponent(`Hi Faction, question about my order #${order.id}.`);

  return (
    <div className="page order-detail">
      <div className="wrap section-sm">
        <Link to="/orderHistory" className="crumb-back mono">
          <ArrowLeft /> All orders
        </Link>
        <header className="od-head">
          <div>
            <p className="kicker">Placed {orderDate(order)}</p>
            <h1 className="h1">Order #{String(order.id).padStart(5, "0")}</h1>
          </div>
          <span className={`tag status-${order.status} od-status`}>
            <i /> {order.status}
          </span>
        </header>

        <ol className={`timeline ${cancelled ? "is-cancelled" : ""}`} style={{ "--done": cancelled ? 0 : step / (ORDER_STEPS.length - 1) }}>
          {ORDER_STEPS.map((s, i) => (
            <li key={s} className={!cancelled && i <= step ? "is-done" : ""}>
              <span className="timeline-dot">{cancelled ? <Close /> : i <= step ? <Check /> : null}</span>
              <span className="mono">{s}</span>
            </li>
          ))}
        </ol>

        <div className="od-grid">
          <section className="od-items">
            <p className="kicker">Items</p>
            {items.map((it) => {
              const hit = index.get(it.variationId);
              return (
                <div key={it.id} className="od-line">
                  <LineImage variationId={it.variationId} index={index} />
                  <div className="od-line-info">
                    <span className="mono dim">{hit?.product?.brand}</span>
                    {hit ? (
                      <Link to={`/viewProduct/${hit.product.id}`} className="cart-line-name">
                        {hit.product.name}
                      </Link>
                    ) : (
                      <span className="cart-line-name">Item #{it.variationId}</span>
                    )}
                    <span className="muted">
                      {hit?.variation?.name} · {formatRM(it.price)} × {it.quantity}
                    </span>
                  </div>
                  <strong>{formatRM(toNumber(it.price) * it.quantity)}</strong>
                </div>
              );
            })}
            <p className="summary-total">
              <span>Total paid</span>
              <strong>{formatRM(order.totalAmount)}</strong>
            </p>
          </section>

          <aside className="summary">
            <p className="kicker">Delivery</p>
            <ul className="od-meta">
              {order.recipientName && (
                <li>
                  <User /> {order.recipientName}
                </li>
              )}
              {order.phoneNumber && (
                <li>
                  <Phone /> {order.phoneNumber}
                </li>
              )}
              <li>
                <Pin /> {order.shippingAddress}
              </li>
              <li>
                <Package /> {cancelled ? "Order cancelled" : step >= 2 ? "On its way" : "Being prepared at the shop"}
              </li>
            </ul>
            <a className="btn btn-ghost btn-block" href={`${SHOP.whatsapp}?text=${wa}`} target="_blank" rel="noopener noreferrer">
              <WhatsApp /> Ask about this order
            </a>
          </aside>
        </div>
      </div>
    </div>
  );
}
