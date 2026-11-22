import { Link } from "react-router";
import { adminApi } from "../../lib/adminApi";
import { useAdminQuery } from "../../lib/hooks";
import { formatDateTime, signed } from "../../lib/format";
import { Drawer } from "../../ui/overlay";
import { EmptyState, ErrorNote, Skeleton } from "../../ui/layout";

export function StockHistoryDrawer({ variation, onClose }) {
  const q = useAdminQuery(() => adminApi.get(`/variations/${variation.id}/stock-movements`, { pageSize: 100 }), [variation.id]);
  return (
    <Drawer title={`Stock history · ${variation.name}`} onClose={onClose}>
      <ErrorNote error={q.error} onRetry={q.reload} />
      {q.loading && <Skeleton />}
      {q.data && !q.data.items.length && <EmptyState title="No stock changes yet" />}
      {q.data?.items.length > 0 && <MovementsTable items={q.data.items} compact />}
    </Drawer>
  );
}

export function MovementsTable({ items, compact = false }) {
  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead>
          <tr>
            <th>When</th>
            {!compact && <th>Item</th>}
            <th className="num">Change</th>
            <th className="num">After</th>
            <th>Reason</th>
            <th>By</th>
          </tr>
        </thead>
        <tbody>
          {items.map((m) => (
            <tr key={m.id}>
              <td className="mono" style={{ fontSize: 12 }}>
                {formatDateTime(m.createdAt)}
              </td>
              {!compact && (
                <td>
                  {m.productId ? (
                    <Link className="adm-row-link" to={`/admin/products/${m.productId}`}>
                      {m.productName}
                    </Link>
                  ) : (
                    <span className="muted">Deleted item</span>
                  )}{" "}
                  <span className="dim">{m.variationName}</span>
                  <div className="mono dim" style={{ fontSize: 11 }}>
                    {m.sku}
                  </div>
                </td>
              )}
              <td className="num" style={{ color: m.delta < 0 ? "var(--danger)" : m.delta > 0 ? "var(--ok)" : undefined }}>
                {signed(m.delta)}
              </td>
              <td className="num">{m.stockAfter}</td>
              <td>
                {m.reasonLabel}
                {m.orderId && (
                  <>
                    {" "}
                    <Link className="link" to={`/admin/orders/${m.orderId}`}>
                      #{m.orderId}
                    </Link>
                  </>
                )}
                {m.note && <div className="adm-hint">{m.note}</div>}
              </td>
              <td className="dim">{m.actorName || "Shop"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
