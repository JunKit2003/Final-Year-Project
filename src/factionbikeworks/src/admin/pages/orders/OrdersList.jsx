import { Link, useSearchParams } from "react-router";
import { adminApi } from "../../lib/adminApi";
import { useAdminQuery, useDebounced } from "../../lib/hooks";
import { formatDateTime, rm } from "../../lib/format";
import { SearchInput, Select, TextInput } from "../../ui/controls";
import { EmptyState, ErrorNote, PageHeader, Pager, Pill, Skeleton } from "../../ui/layout";
import { PAYMENT_LABEL, STATUSES, STATUS_TONE, paymentLabel } from "./orderUi";

const PAGE_SIZE = 25;

export default function OrdersList() {
  const [params, setParams] = useSearchParams();
  const get = (k) => params.get(k) || "";
  const set = (k, v) => {
    const next = new URLSearchParams(params);
    v ? next.set(k, v) : next.delete(k);
    if (k !== "page") next.delete("page");
    setParams(next, { replace: true });
  };
  const q = useDebounced(get("q"));
  const page = Number(get("page")) || 1;
  const filters = { status: get("status"), payment: get("payment"), from: get("from"), to: get("to") };
  const filtered = !!(q || Object.values(filters).some(Boolean));
  const list = useAdminQuery(() => adminApi.get("/orders", { ...filters, q, page, pageSize: PAGE_SIZE }), [q, filters.status, filters.payment, filters.from, filters.to, page]);

  return (
    <>
      <PageHeader kicker="Sales" title="Orders" />
      <div className="adm-toolbar">
        <SearchInput value={get("q")} onChange={(v) => set("q", v)} placeholder="Search order, customer, phone or SKU" />
        <Select value={filters.status} onChange={(v) => set("status", v)} options={[["", "All statuses"], ...STATUSES.map((s) => [s, s])]} aria-label="Status" />
        <Select value={filters.payment} onChange={(v) => set("payment", v)} options={[["", "Any payment"], ...Object.entries(PAYMENT_LABEL), ["pending_refund", "Refund pending"]]} aria-label="Payment" />
        <TextInput type="date" value={filters.from} onChange={(v) => set("from", v)} aria-label="From" style={{ width: "auto" }} />
        <TextInput type="date" value={filters.to} onChange={(v) => set("to", v)} aria-label="To" style={{ width: "auto" }} />
        {filtered && (
          <button type="button" className="link" onClick={() => setParams({}, { replace: true })}>
            Clear filters
          </button>
        )}
      </div>
      <ErrorNote error={list.error} onRetry={list.reload} />
      {list.loading && !list.data && <Skeleton rows={6} />}
      {list.data && !list.data.items.length && (
        <EmptyState title={filtered ? "No matching orders" : "No orders yet"}>{filtered ? "Try a different search or clear the filters." : "Orders will appear here as customers check out."}</EmptyState>
      )}
      {list.data?.items.length > 0 && (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Customer</th>
                <th className="num">Items</th>
                <th className="num">Total</th>
                <th>Status</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {list.data.items.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link className="adm-row-link mono" to={`/admin/orders/${o.id}`}>
                      #{o.id}
                    </Link>
                  </td>
                  <td className="dim">{formatDateTime(o.createdAt)}</td>
                  <td>
                    {o.recipientName}
                    <div className="dim" style={{ fontSize: 12.5 }}>
                      {o.customer?.email}
                    </div>
                  </td>
                  <td className="num">{o.itemCount}</td>
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
        </div>
      )}
      {list.data && <Pager page={page} pageSize={PAGE_SIZE} total={list.data.total} onPage={(n) => set("page", String(n))} />}
    </>
  );
}
