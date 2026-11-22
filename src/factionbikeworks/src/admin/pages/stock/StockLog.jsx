import { useSearchParams } from "react-router";
import { adminApi } from "../../lib/adminApi";
import { useAdminQuery, useDebounced } from "../../lib/hooks";
import { Button, SearchInput, Select, TextInput } from "../../ui/controls";
import { EmptyState, ErrorNote, PageHeader, Pager, Skeleton } from "../../ui/layout";
import { MovementsTable } from "./StockHistoryDrawer";
import { useToast } from "../../../lib/store";

const REASONS = [
  ["", "All reasons"],
  ["checkout_hold", "Checkout hold"],
  ["hold_released", "Hold released"],
  ["cancel_restock", "Cancel restock"],
  ["received", "Received delivery"],
  ["damaged", "Damaged or lost"],
  ["count_correction", "Count correction"],
  ["import", "CSV import"],
  ["initial", "Starting stock"],
];

export default function StockLog() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const get = (k) => params.get(k) || "";
  const set = (k, v) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== "page") next.delete("page");
    setParams(next, { replace: true });
  };
  const sku = useDebounced(get("sku"));
  const query = { reason: get("reason"), from: get("from"), to: get("to"), sku, page: get("page") || 1 };
  const q = useAdminQuery(() => adminApi.get("/stock-movements", query), [query.reason, query.from, query.to, sku, query.page]);

  return (
    <>
      <PageHeader
        kicker="Stock"
        title="Stock log"
        actions={
          <Button onClick={() => adminApi.download(`/stock-movements.csv?${new URLSearchParams({ reason: query.reason, from: query.from, to: query.to, sku })}`, "stock-movements.csv").catch((e) => toast(e.message, "error"))}>
            Export CSV
          </Button>
        }
      >
        <p className="muted">Every change to a stock count, newest first.</p>
      </PageHeader>
      <div className="adm-toolbar">
        <SearchInput value={get("sku")} onChange={(v) => set("sku", v)} placeholder="Search SKU" />
        <Select value={get("reason")} onChange={(v) => set("reason", v)} options={REASONS} aria-label="Reason" />
        <TextInput type="date" value={get("from")} onChange={(v) => set("from", v)} aria-label="From" style={{ width: "auto" }} />
        <TextInput type="date" value={get("to")} onChange={(v) => set("to", v)} aria-label="To" style={{ width: "auto" }} />
      </div>
      <ErrorNote error={q.error} onRetry={q.reload} />
      {q.loading && !q.data && <Skeleton />}
      {q.data && !q.data.items.length && <EmptyState title="No stock changes match">Try a different reason or date.</EmptyState>}
      {q.data?.items.length > 0 && <MovementsTable items={q.data.items} />}
      {q.data && <Pager page={Number(query.page)} pageSize={50} total={q.data.total} onPage={(p) => set("page", String(p))} />}
    </>
  );
}
