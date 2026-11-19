import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import api from "../lib/api";
import { useProducts, useSession } from "../lib/store";
import { formatRM, indexVariations } from "../lib/shop";
import { Empty, Loader, PageHead } from "../components/ui/Bits";
import { LineImage } from "./Cart";
import { Arrow, ArrowUpRight } from "../components/ui/Icons";

export const orderDate = (o) => (o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" }) : "");

export default function OrderHistory() {
  const { user, checking } = useSession();
  const { products } = useProducts();
  const index = useMemo(() => indexVariations(products), [products]);
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("All");

  useEffect(() => {
    if (!user) return;
    api
      .get(`/api/cart/getUserOrders/${user.id}`)
      .then((res) => setOrders(res.data?.orders || []))
      .catch(() => {
        setError("We couldn't load your orders.");
        setOrders([]);
      });
  }, [user]);

  if (checking || (user && orders === null)) return <Loader label="Loading your orders" />;

  if (!user) {
    return (
      <div className="wrap section">
        <Empty kicker="Orders" title="Sign in to see your orders" action={<Link to="/login" state={{ from: "/orderHistory" }} className="btn btn-primary">Sign in</Link>} />
      </div>
    );
  }

  const statuses = ["All", ...new Set(orders.map((o) => o.status))];
  const list = status === "All" ? orders : orders.filter((o) => o.status === status);

  return (
    <div className="page orders">
      <PageHead kicker={`${orders.length} ${orders.length === 1 ? "order" : "orders"}`} lines={["Order", "history"]} outline={[1]} />
      <div className="wrap section-sm">
        {error && <div className="alert alert-error">{error}</div>}
        {orders.length === 0 ? (
          <Empty kicker="No orders yet" title="Your first upgrade awaits" action={<Link to="/catalog" className="btn btn-primary">Shop parts <Arrow /></Link>} />
        ) : (
          <>
            {statuses.length > 2 && (
              <div className="facet-pills orders-filter">
                {statuses.map((s) => (
                  <button type="button" key={s} className={`pill ${status === s ? "is-on" : ""}`} onClick={() => setStatus(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div className="order-list">
              {list.map((o) => {
                const items = o.items || [];
                return (
                  <Link key={o.id} to={`/customerViewOrderList/${o.userId}/${o.id}`} className="order-card">
                    <div className="order-card-head">
                      <span className="mono">#{String(o.id).padStart(5, "0")}</span>
                      <span className={`tag status-${o.status}`}>
                        <i /> {o.status}
                      </span>
                    </div>
                    <div className="order-thumbs">
                      {items.slice(0, 4).map((it) => (
                        <LineImage key={it.id} variationId={it.variationId} index={index} />
                      ))}
                      {items.length > 4 && <span className="order-more mono">+{items.length - 4}</span>}
                    </div>
                    <div className="order-card-foot">
                      <span className="muted">
                        {orderDate(o)} · {items.reduce((n, it) => n + Number(it.quantity), 0)} items
                      </span>
                      <strong>{formatRM(o.totalAmount)}</strong>
                      <ArrowUpRight className="order-go" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
