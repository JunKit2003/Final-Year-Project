import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { adminApi } from "../../lib/adminApi";
import { useAdminQuery, useDebounced } from "../../lib/hooks";
import { formatRM, plural } from "../../lib/format";
import { Button, Combobox, MoneyInput, SearchInput, Select } from "../../ui/controls";
import { ConfirmDialog, Popover } from "../../ui/overlay";
import { EmptyState, ErrorNote, PageHeader, Pager, Pill, Skeleton } from "../../ui/layout";
import { StockAdjust } from "../stock/StockAdjust";
import { StockHistoryDrawer } from "../stock/StockHistoryDrawer";
import { ImportDialog } from "./ImportDialog";
import { useToast } from "../../../lib/store";
import { assetUrl } from "../../../lib/api";

const CHIPS = [
  ["all", "All"],
  ["live", "Live"],
  ["draft", "Draft"],
  ["archived", "Archived"],
  ["low", "Low stock"],
  ["out", "Out of stock"],
];
const STATUS_LABEL = { live: "Live", draft: "Draft", archived: "Archived" };
const PAGE_SIZE = 25;

export default function ProductsList() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const get = (k) => params.get(k) || "";
  const set = (changes) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) v ? next.set(k, v) : next.delete(k);
    if (!("page" in changes)) next.delete("page");
    setParams(next, { replace: true });
  };
  const chip = get("status") || get("stock") || "all";
  const q = useDebounced(get("q"));
  const page = Number(get("page")) || 1;
  const list = useAdminQuery(
    () => adminApi.get("/products", { q, status: get("status"), stock: get("stock"), category: get("category"), brand: get("brand"), sort: get("sort"), page, pageSize: PAGE_SIZE }),
    [q, get("status"), get("stock"), get("category"), get("brand"), get("sort"), page]
  );
  const tax = useAdminQuery(() => adminApi.get("/taxonomy"), []);
  const [selected, setSelected] = useState(() => new Set());
  const [quick, setQuick] = useState(null); // { mode: "price"|"stock", product, anchor }
  const [adjust, setAdjust] = useState(null); // { variation, anchor }
  const [history, setHistory] = useState(null);
  const [importing, setImporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [bulkValue, setBulkValue] = useState({ category: "", brand: "" });
  const [bulkPending, setBulkPending] = useState(false);

  const items = list.data?.items || [];
  const allOn = items.length > 0 && items.every((p) => selected.has(p.id));
  const toggle = (id) => setSelected((s) => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const bulk = async (action, value) => {
    setBulkPending(true);
    try {
      const r = await adminApi.post("/products/bulk", { ids: [...selected], action, value });
      if (action === "delete") {
        toast(r.archivedInstead ? `${plural(r.deleted, "product")} deleted. ${plural(r.archivedInstead, "product")} ${r.archivedInstead === 1 ? "has" : "have"} orders, so ${r.archivedInstead === 1 ? "it was" : "they were"} archived instead.` : `${plural(r.deleted, "product")} deleted`);
      } else toast(`${plural(r.updated, "product")} updated`);
      setSelected(new Set());
      list.reload();
      tax.reload();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setBulkPending(false);
      setConfirmDelete(false);
    }
  };

  const patchVariation = (productId, variationId, patch) =>
    list.setData((d) => ({ ...d, items: d.items.map((p) => (p.id !== productId ? p : { ...p, variations: p.variations.map((v) => (v.id === variationId ? { ...v, ...patch } : v)) })) }));

  const categories = (tax.data?.categories || []).map((c) => c.name);
  const brands = (tax.data?.brands || []).map((b) => b.name);

  return (
    <>
      <PageHeader
        kicker="Catalogue"
        title="Products"
        actions={
          <>
            <Button onClick={() => setImporting(true)}>Import CSV</Button>
            <Button onClick={() => adminApi.download("/products/export.csv", "products.csv").catch((e) => toast(e.message, "error"))}>Export CSV</Button>
            <Link to="/admin/products/new" className="btn btn-primary adm-btn">
              New product
            </Link>
          </>
        }
      />

      <div className="adm-toolbar">
        <SearchInput value={get("q")} onChange={(v) => set({ q: v })} placeholder="Search name, brand or SKU" />
        <div className="adm-chips" role="group" aria-label="Filter">
          {CHIPS.map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={`adm-chip ${chip === k ? "is-on" : ""}`}
              aria-pressed={chip === k}
              onClick={() => set({ status: ["live", "draft", "archived"].includes(k) ? k : "", stock: ["low", "out"].includes(k) ? k : "" })}
            >
              {label}
            </button>
          ))}
        </div>
        <Select value={get("category")} onChange={(v) => set({ category: v })} options={[["", "All categories"], ...categories.map((c) => [c, c])]} aria-label="Category" />
        <Select value={get("brand")} onChange={(v) => set({ brand: v })} options={[["", "All brands"], ...brands.map((b) => [b, b])]} aria-label="Brand" />
        <Select value={get("sort") || "updated"} onChange={(v) => set({ sort: v === "updated" ? "" : v })} options={[["updated", "Recently updated"], ["name", "Name A to Z"], ["stock", "Lowest stock"]]} aria-label="Sort" />
      </div>

      {selected.size > 0 && (
        <div className="adm-bulkbar" role="region" aria-label="Bulk actions">
          <strong>{selected.size} selected</strong>
          <Select value="" onChange={(v) => v && bulk("status", v)} options={[["", "Set status…"], ["live", "Live"], ["draft", "Draft"], ["archived", "Archived"]]} aria-label="Set status" disabled={bulkPending} />
          <span style={{ width: 180 }}>
            <Combobox value={bulkValue.category} onChange={(v) => setBulkValue((b) => ({ ...b, category: v }))} options={categories} placeholder="Change category" aria-label="Change category" />
          </span>
          <Button size="sm" disabled={!bulkValue.category.trim() || bulkPending} onClick={() => bulk("category", bulkValue.category)}>
            Apply
          </Button>
          <span style={{ width: 180 }}>
            <Combobox value={bulkValue.brand} onChange={(v) => setBulkValue((b) => ({ ...b, brand: v }))} options={brands} placeholder="Change brand" aria-label="Change brand" />
          </span>
          <Button size="sm" disabled={!bulkValue.brand.trim() || bulkPending} onClick={() => bulk("brand", bulkValue.brand)}>
            Apply
          </Button>
          <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)} disabled={bulkPending}>
            Delete
          </Button>
          <button type="button" className="link" onClick={() => setSelected(new Set())} style={{ marginLeft: "auto" }}>
            Clear
          </button>
        </div>
      )}

      <ErrorNote error={list.error} onRetry={list.reload} />
      {list.loading && !list.data && <Skeleton rows={6} />}
      {list.data && !items.length && (
        <EmptyState
          title={q || chip !== "all" || get("category") || get("brand") ? "No matching products" : "No products yet"}
          action={
            <Link to="/admin/products/new" className="btn btn-primary adm-btn">
              New product
            </Link>
          }
        >
          {q || chip !== "all" ? "Try a different search or clear the filters." : "Add your first product, or import a CSV."}
        </EmptyState>
      )}

      {items.length > 0 && (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th className="shrink">
                  <input type="checkbox" aria-label="Select all on this page" checked={allOn} onChange={() => setSelected(allOn ? new Set() : new Set(items.map((p) => p.id)))} />
                </th>
                <th className="shrink" aria-label="Photo" />
                <th>Product</th>
                <th>Category</th>
                <th className="num">Variants</th>
                <th className="num">Price</th>
                <th className="num">Stock</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <input type="checkbox" aria-label={`Select ${p.name}`} checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                  </td>
                  <td>{p.thumb ? <img className="adm-thumb" src={assetUrl(p.thumb)} alt="" loading="lazy" /> : <span className="adm-thumb" style={{ display: "block" }} />}</td>
                  <td>
                    <Link to={`/admin/products/${p.id}`} className="adm-row-link">
                      {p.name}
                    </Link>{" "}
                    {p.featured && <span title="Featured" aria-label="Featured">★</span>}
                    <div className="dim" style={{ fontSize: 12.5 }}>
                      {p.brand}
                    </div>
                  </td>
                  <td>{p.category}</td>
                  <td className="num">{p.variantCount}</td>
                  <td className="num">
                    <button type="button" className="adm-cell-btn" onClick={(e) => setQuick({ mode: "price", product: p, anchor: e.currentTarget })} aria-label={`Edit prices of ${p.name}`}>
                      {p.minPrice === p.maxPrice ? formatRM(p.minPrice) : `${formatRM(p.minPrice)} to ${formatRM(p.maxPrice)}`}
                    </button>
                  </td>
                  <td className="num">
                    <button type="button" className="adm-cell-btn" onClick={(e) => setQuick({ mode: "stock", product: p, anchor: e.currentTarget })} aria-label={`Edit stock of ${p.name}`}>
                      {p.variations.reduce((s, v) => s + v.stock, 0)}
                    </button>{" "}
                    {p.stockFlag !== "in" && <Pill tone={p.stockFlag}>{p.stockFlag === "out" ? "Out" : "Low"}</Pill>}
                  </td>
                  <td>
                    <Pill tone={p.status}>{STATUS_LABEL[p.status]}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {list.data && <Pager page={page} pageSize={PAGE_SIZE} total={list.data.total} onPage={(n) => set({ page: String(n) })} />}

      {quick && (
        <QuickEdit
          {...quick}
          onClose={() => setQuick(null)}
          onAdjust={(variation, anchor) => {
            setQuick(null);
            setAdjust({ variation: { ...variation, productId: quick.product.id }, anchor });
          }}
          onHistory={(variation) => {
            setQuick(null);
            setHistory(variation);
          }}
          onPriceSaved={(variationId, patch) => {
            patchVariation(quick.product.id, variationId, patch);
            list.reload();
          }}
        />
      )}
      {adjust && (
        <StockAdjust
          anchor={adjust.anchor}
          variation={adjust.variation}
          onClose={() => setAdjust(null)}
          onDone={(stock) => {
            patchVariation(adjust.variation.productId, adjust.variation.id, { stock });
            list.reload();
          }}
        />
      )}
      {history && <StockHistoryDrawer variation={history} onClose={() => setHistory(null)} />}
      {importing && (
        <ImportDialog
          onClose={() => setImporting(false)}
          onDone={() => {
            list.reload();
            tax.reload();
          }}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog title={`Delete ${plural(selected.size, "product")}?`} confirmLabel="Delete" tone="danger" pending={bulkPending} onCancel={() => setConfirmDelete(false)} onConfirm={() => bulk("delete")}>
          Products that have been ordered are archived instead, so order history stays complete. This can&apos;t be undone.
        </ConfirmDialog>
      )}
    </>
  );
}

/** Popover listing a product's variants: edit prices inline, or open stock tools. */
function QuickEdit({ mode, product, anchor, onClose, onAdjust, onHistory, onPriceSaved }) {
  const toast = useToast();
  const [prices, setPrices] = useState(() => Object.fromEntries(product.variations.map((v) => [v.id, v.price])));
  const [saving, setSaving] = useState(null);
  const savePrice = async (v) => {
    setSaving(v.id);
    try {
      const r = await adminApi.patch(`/variations/${v.id}`, { price: prices[v.id], version: v.version });
      toast(`Price of ${v.name} set to ${formatRM(r.price)}`);
      onPriceSaved(v.id, { price: r.price, version: r.version });
    } catch (e) {
      toast(e.errors?.price || e.errors?.compareAtPrice || e.message, "error");
    } finally {
      setSaving(null);
    }
  };
  return (
    <Popover anchor={anchor} onClose={onClose} label={mode === "price" ? "Edit prices" : "Stock"}>
      <p className="adm-h3">{product.name}</p>
      <div className="adm-stack">
        {product.variations.map((v) => (
          <div key={v.id} className="adm-row" style={{ alignItems: "center", flexWrap: "nowrap" }}>
            <div style={{ flex: "1 1 auto", minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{v.name}</div>
              <div className="mono dim" style={{ fontSize: 11 }}>
                {v.sku}
              </div>
            </div>
            {mode === "price" ? (
              <>
                <span style={{ flex: "0 0 120px" }}>
                  <MoneyInput value={prices[v.id]} onChange={(val) => setPrices((p) => ({ ...p, [v.id]: val }))} aria-label={`Price of ${v.name}`} />
                </span>
                <Button size="sm" variant="primary" style={{ flex: "0 0 auto" }} loading={saving === v.id} disabled={prices[v.id] === "" || Number(prices[v.id]) === v.price} onClick={() => savePrice(v)}>
                  Save
                </Button>
              </>
            ) : (
              <>
                <strong className="num" style={{ flex: "0 0 auto" }}>
                  {v.stock}
                </strong>
                <Button size="sm" style={{ flex: "0 0 auto" }} onClick={(e) => onAdjust(v, e.currentTarget.closest(".adm-popover") ? anchor : e.currentTarget)}>
                  Adjust
                </Button>
                <button type="button" className="link" style={{ flex: "0 0 auto" }} onClick={() => onHistory(v)}>
                  History
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </Popover>
  );
}
