import { useState } from "react";
import { Link } from "react-router";
import { adminApi } from "../lib/adminApi";
import { useAdminQuery } from "../lib/hooks";
import { formatDateTime, plural, rm } from "../lib/format";
import { EmptyState, ErrorNote, PageHeader, Panel, Pill, Skeleton } from "../ui/layout";
import { StockAdjust } from "./stock/StockAdjust";
import { STATUS_TONE, paymentLabel } from "./orders/orderUi";
import { useSession } from "../../lib/store";

export default function Dashboard() {
  const { user } = useSession();
  const q = useAdminQuery(() => adminApi.get("/dashboard"), []);
  const [adjust, setAdjust] = useState(null);
  const d = q.data;
  return (
    <>
      <PageHeader kicker="Dashboard" title={`Hi ${user?.first_name || user?.username || "there"}`} />
      <ErrorNote error={q.error} onRetry={q.reload} />
      {!d ? (
        <Skeleton rows={4} />
      ) : (
        <>
          <div className="adm-cards">
            <Link to="/admin/orders?status=Paid" className={`adm-card ${d.toShip ? "is-alert" : ""}`}>
              <strong>{d.toShip}</strong>
              <span>{d.toShip === 1 ? "order to ship" : "orders to ship"}</span>
            </Link>
            <Link to="/admin/products?stock=low" className={`adm-card ${d.lowStock.length ? "is-alert" : ""}`}>
              <strong>{d.lowStock.length}</strong>
              <span>low on stock</span>
            </Link>
            <Link to="/admin/orders?payment=pending_refund" className={`adm-card ${d.pendingRefunds ? "is-alert" : ""}`}>
              <strong>{d.pendingRefunds}</strong>
              <span>{d.pendingRefunds === 1 ? "refund waiting for Stripe" : "refunds waiting for Stripe"}</span>
            </Link>
            <div className="adm-card">
              <strong>{rm(d.sales7.total)}</strong>
              <span>sales, last 7 days ({plural(d.sales7.orders, "order")})</span>
            </div>
            <div className="adm-card">
              <strong>{rm(d.sales30.total)}</strong>
              <span>sales, last 30 days ({plural(d.sales30.orders, "order")})</span>
            </div>
          </div>
          {d.duplicateSkus.length > 0 && (
            <div className="adm-banner" role="alert">
              <strong>Fix duplicate SKUs:</strong> {d.duplicateSkus.join(", ")}. Each SKU should belong to one variant.
              <Link className="link" to={`/admin/products?q=${encodeURIComponent(d.duplicateSkus[0])}`}>
                Find them
              </Link>
            </div>
          )}
          <div className="adm-grid-2" style={{ gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr)" }}>
            <Panel title="Recent orders" actions={<Link className="link" to="/admin/orders">All orders</Link>} flush>
              {d.recentOrders.length === 0 ? (
                <div style={{ padding: 18 }}>
                  <EmptyState title="No orders yet">Orders will appear here as customers check out.</EmptyState>
                </div>
              ) : (
                <table className="adm-table">
                  <tbody>
                    {d.recentOrders.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <Link className="adm-row-link mono" to={`/admin/orders/${o.id}`}>
                            #{o.id}
                          </Link>
                          <div className="adm-hint">{formatDateTime(o.createdAt)}</div>
                        </td>
                        <td>{o.recipientName}</td>
                        <td className="num">{rm(o.totalAmount)}</td>
                        <td>
                          <Pill tone={STATUS_TONE[o.status]}>{o.status}</Pill>
                        </td>
                        <td>
                          <Pill tone={o.paymentState}>{paymentLabel(o.paymentState)}</Pill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>
            <Panel title="Low stock" description="Live variants at or under their alert level." flush>
              {d.lowStock.length === 0 ? (
                <p className="adm-hint" style={{ padding: 18 }}>
                  Everything is well stocked.
                </p>
              ) : (
                <table className="adm-table">
                  <tbody>
                    {d.lowStock.map((v) => (
                      <tr key={v.variationId}>
                        <td>
                          <Link className="adm-row-link" to={`/admin/products/${v.productId}`}>
                            {v.name}
                          </Link>{" "}
                          <span className="dim">{v.variant}</span>
                          <div className="mono dim" style={{ fontSize: 11 }}>
                            {v.sku}
                          </div>
                        </td>
                        <td className="num">
                          <Pill tone={v.stock === 0 ? "out" : "low"}>{v.stock === 0 ? "Out" : `${v.stock} left`}</Pill>
                        </td>
                        <td className="shrink">
                          <button type="button" className="link" onClick={(e) => setAdjust({ v: { id: v.variationId, name: v.variant, sku: v.sku, stock: v.stock }, anchor: e.currentTarget })}>
                            Adjust
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>
          </div>
        </>
      )}
      {adjust && <StockAdjust anchor={adjust.anchor} variation={adjust.v} onClose={() => setAdjust(null)} onDone={() => q.reload()} />}
    </>
  );
}
