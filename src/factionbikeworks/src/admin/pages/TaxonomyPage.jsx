import { useState } from "react";
import { Link } from "react-router";
import { adminApi } from "../lib/adminApi";
import { useAdminQuery } from "../lib/hooks";
import { useDragOrder } from "../lib/useDragOrder";
import { plural } from "../lib/format";
import { Button, Combobox, Field, Toggle } from "../ui/controls";
import { Dialog } from "../ui/overlay";
import { ErrorNote, PageHeader, Panel, Skeleton } from "../ui/layout";
import { ImageDrop } from "../ui/ImageDrop";
import { assetUrl } from "../../lib/api";
import { useToast } from "../../lib/store";

export default function TaxonomyPage() {
  const toast = useToast();
  const tax = useAdminQuery(() => adminApi.get("/taxonomy"), []);
  const brands = useAdminQuery(() => adminApi.get("/brands"), []);
  const [rename, setRename] = useState(null); // { kind, from }
  const reload = () => {
    tax.reload();
    brands.reload();
  };
  const reorder = async (next) => {
    brands.setData({ items: next });
    try {
      brands.setData(await adminApi.patch("/brands/order", { ids: next.map((b) => b.id) }));
    } catch (e) {
      toast(e.message, "error");
      brands.reload();
    }
  };
  const list = brands.data?.items || [];
  const { itemProps, move } = useDragOrder(list, reorder);

  return (
    <>
      <PageHeader kicker="Catalogue" title="Categories & brands">
        <p className="muted">Rename to fix typos. Renaming to a name that already exists merges the two.</p>
      </PageHeader>
      <ErrorNote error={tax.error || brands.error} onRetry={reload} />
      {!tax.data || !brands.data ? (
        <Skeleton rows={6} />
      ) : (
        <div className="adm-grid-2" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)" }}>
          <Panel title="Categories" flush>
            <table className="adm-table">
              <tbody>
                {tax.data.categories.map((c) => (
                  <tr key={c.name}>
                    <td>
                      <Link className="adm-row-link" to={`/admin/products?category=${encodeURIComponent(c.name)}`}>
                        {c.name}
                      </Link>
                    </td>
                    <td className="num dim">{plural(c.count, "product")}</td>
                    <td className="shrink">
                      <button type="button" className="link" onClick={() => setRename({ kind: "category", from: c.name })}>
                        Rename
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
          <Panel title="Brands" description="Logos, visibility on the home page brand wall, and order. Drag to reorder." flush>
            <table className="adm-table">
              <tbody>
                {list.map((b, i) => (
                  <tr key={b.id} {...itemProps(i)}>
                    <td className="shrink">
                      <span className="handle" style={{ cursor: "grab" }} aria-hidden>
                        ⋮⋮
                      </span>
                    </td>
                    <td className="shrink">
                      <BrandLogo brand={b} onSaved={brands.reload} />
                    </td>
                    <td>
                      <strong>{b.brandName}</strong>
                      <div className="dim" style={{ fontSize: 12.5 }}>
                        {plural(b.productCount, "product")}
                      </div>
                    </td>
                    <td>
                      <BrandVisible brand={b} onSaved={brands.reload} />
                    </td>
                    <td className="shrink" style={{ whiteSpace: "nowrap" }}>
                      <button type="button" className="icon-btn adm-icon-sm" aria-label={`Move ${b.brandName} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                        ↑
                      </button>{" "}
                      <button type="button" className="icon-btn adm-icon-sm" aria-label={`Move ${b.brandName} down`} disabled={i === list.length - 1} onClick={() => move(i, 1)}>
                        ↓
                      </button>{" "}
                      <button type="button" className="link" onClick={() => setRename({ kind: "brand", from: b.brandName })}>
                        Rename
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>
      )}
      {rename && <RenameDialog {...rename} options={(rename.kind === "category" ? tax.data.categories : tax.data.brands).map((x) => x.name).filter((n) => n !== rename.from)} onClose={() => setRename(null)} onDone={reload} />}
    </>
  );
}

function BrandLogo({ brand, onSaved }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const upload = async ([file]) => {
    setBusy(true);
    try {
      await adminApi.upload(`/brands/${brand.id}`, file, {}, "put");
      toast(`Logo for ${brand.brandName} updated`);
      onSaved();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };
  return brand.imageUrl ? (
    <label className="adm-photo" style={{ width: 72, height: 48, display: "block", cursor: "pointer" }} title="Replace logo">
      <img src={assetUrl(brand.imageUrl)} alt={`${brand.brandName} logo`} style={{ objectFit: "contain", background: "#fff" }} />
      <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && upload([e.target.files[0]])} aria-label={`Replace ${brand.brandName} logo`} />
    </label>
  ) : (
    <div style={{ width: 72 }}>
      <ImageDrop compact multiple={false} label={busy ? "…" : "Logo"} disabled={busy} onFiles={upload} onError={(m) => toast(m, "error")} />
    </div>
  );
}

function BrandVisible({ brand, onSaved }) {
  const toast = useToast();
  return (
    <Toggle
      checked={brand.isVisible}
      label={brand.isVisible ? "Shown" : "Hidden"}
      onChange={async (v) => {
        try {
          await adminApi.upload(`/brands/${brand.id}`, null, { isVisible: v }, "put");
          onSaved();
        } catch (e) {
          toast(e.message, "error");
        }
      }}
    />
  );
}

function RenameDialog({ kind, from, options, onClose, onDone }) {
  const toast = useToast();
  const [to, setTo] = useState(from);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const merging = options.some((o) => o.toLowerCase() === to.trim().toLowerCase());
  const save = async () => {
    setPending(true);
    try {
      const r = await adminApi.post("/taxonomy/rename", { kind, from, to });
      toast(`${merging ? "Merged" : "Renamed"}: ${plural(r.moved, "product")} moved to ${to.trim()}`);
      onDone();
      onClose();
    } catch (e) {
      setError(e.errors?.to || e.message);
    } finally {
      setPending(false);
    }
  };
  return (
    <Dialog
      title={`Rename ${kind} ${from}`}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={pending} disabled={!to.trim() || to.trim() === from} onClick={save}>
            {merging ? "Merge" : "Rename"}
          </Button>
        </>
      }
    >
      <Field label="New name" error={error} hint={merging ? `${to.trim()} already exists: its products and these will be merged.` : undefined}>
        <Combobox value={to} onChange={setTo} options={options} createLabel={(t) => `Rename to '${t}'`} />
      </Field>
    </Dialog>
  );
}
