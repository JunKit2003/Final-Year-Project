import { useState } from "react";
import { adminApi } from "../../lib/adminApi";
import { plural } from "../../lib/format";
import { Button } from "../../ui/controls";
import { Dialog } from "../../ui/overlay";
import { Pill } from "../../ui/layout";
import { useToast } from "../../../lib/store";

const ACTION = {
  update: ["Update", "info"],
  unchanged: ["No change", "dim"],
  create_variant: ["New variant", "ok"],
  create_product: ["New product", "ok"],
  error: ["Error", "danger"],
};

/** Upload a CSV, show what would change, then apply. */
export function ImportDialog({ onClose, onDone }) {
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);

  const run = async (dryRun) => {
    setPending(true);
    setError(null);
    try {
      const r = await adminApi.upload(`/products/import${dryRun ? "?dryRun=1" : ""}`, file);
      if (dryRun) setPlan(r);
      else {
        const s = r.summary;
        toast(`Imported: ${s.update} updated, ${s.createVariant + s.createProduct} new variants${s.newProducts ? `, ${plural(s.newProducts, "new draft product")}` : ""}`);
        onDone();
        onClose();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setPending(false);
    }
  };

  const s = plan?.summary;
  return (
    <Dialog
      title="Import products from CSV"
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {!plan ? (
            <Button variant="primary" disabled={!file} loading={pending} onClick={() => run(true)}>
              Check file
            </Button>
          ) : (
            <Button variant="primary" disabled={!s.applicable} loading={pending} onClick={() => run(false)}>
              Import {plural(s.applicable, "row")}
            </Button>
          )}
        </>
      }
    >
      <p className="muted">
        One row per variant. Rows are matched by SKU: a known SKU updates that variant, a new SKU with a product_id adds a variant, and rows without a product_id become new draft products. Variants missing from the file are left alone. Export a CSV first to get the columns.
      </p>
      <input
        type="file"
        accept=".csv,text/csv"
        aria-label="CSV file"
        onChange={(e) => {
          setFile(e.target.files?.[0] || null);
          setPlan(null);
        }}
      />
      {error && (
        <p className="adm-error" role="alert">
          {error}
        </p>
      )}
      {plan && (
        <>
          <p>
            <strong>{s.update}</strong> to update · <strong>{s.createVariant + s.createProduct}</strong> new variants
            {s.newProducts > 0 && (
              <>
                {" "}
                in <strong>{plural(s.newProducts, "new product")}</strong>
              </>
            )}{" "}
            · <strong>{s.unchanged}</strong> unchanged · <strong style={{ color: s.error ? "var(--danger)" : undefined }}>{s.error}</strong> with errors (skipped)
          </p>
          <div className="adm-table-wrap" style={{ maxHeight: 360, overflowY: "auto" }}>
            <table className="adm-table">
              <thead>
                <tr>
                  <th className="num">Line</th>
                  <th>SKU</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {plan.lines.map((l) => (
                  <tr key={l.line}>
                    <td className="num">{l.line}</td>
                    <td className="mono">{l.sku}</td>
                    <td>
                      <Pill tone={ACTION[l.action][1]}>{ACTION[l.action][0]}</Pill>
                    </td>
                    <td className={l.action === "error" ? "adm-error" : "muted"}>{l.message || (l.changes?.length ? l.changes.join(", ") : "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Dialog>
  );
}
