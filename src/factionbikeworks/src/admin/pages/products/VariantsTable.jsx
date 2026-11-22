import { useState } from "react";
import { Button, MoneyInput, NumberInput, TextInput } from "../../ui/controls";

/** Spreadsheet-style variant editing. Rows drag to reorder by their handle. */
export function VariantsTable({ variations, errors, dispatch, onAdjust, onHistory }) {
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);
  const set = (index, field) => (value) => dispatch({ type: "setVariant", index, field, value });
  return (
    <div className="adm-stack">
      <div className="adm-table-wrap">
        <table className="adm-table adm-variants">
          <thead>
            <tr>
              <th className="shrink" aria-label="Reorder" />
              <th>Name</th>
              <th>SKU</th>
              <th>Price</th>
              <th>Was price</th>
              <th>Stock</th>
              <th>Intended use</th>
              <th className="shrink" aria-label="Row actions" />
            </tr>
          </thead>
          <tbody>
            {variations.map((v, i) => {
              const e = errors[v.key] || {};
              return (
                <tr
                  key={v.key}
                  className={`${over === i && drag !== null && drag !== i ? "is-drop-target" : ""} ${Object.keys(e).length ? "has-error" : ""}`}
                  onDragOver={(ev) => {
                    if (drag === null) return;
                    ev.preventDefault();
                    setOver(i);
                  }}
                  onDrop={(ev) => {
                    ev.preventDefault();
                    if (drag !== null && drag !== i) dispatch({ type: "moveVariant", from: drag, to: i });
                    setDrag(null);
                    setOver(null);
                  }}
                >
                  <td>
                    <span
                      className="handle"
                      draggable
                      role="button"
                      tabIndex={0}
                      aria-label={`Move ${v.name || "variant"} (use arrow keys)`}
                      onDragStart={(ev) => {
                        ev.dataTransfer.effectAllowed = "move";
                        ev.dataTransfer.setData("text/plain", String(i));
                        setDrag(i);
                      }}
                      onDragEnd={() => {
                        setDrag(null);
                        setOver(null);
                      }}
                      onKeyDown={(ev) => {
                        if (ev.key === "ArrowUp" && i > 0) dispatch({ type: "moveVariant", from: i, to: i - 1 });
                        if (ev.key === "ArrowDown" && i < variations.length - 1) dispatch({ type: "moveVariant", from: i, to: i + 1 });
                      }}
                    >
                      ⋮⋮
                    </span>
                  </td>
                  <Cell error={e.name}>
                    <TextInput value={v.name} onChange={set(i, "name")} aria-label={`Variant ${i + 1} name`} placeholder="Red" maxLength={100} />
                  </Cell>
                  <Cell error={e.sku}>
                    <TextInput value={v.sku} onChange={set(i, "sku")} aria-label={`Variant ${i + 1} SKU`} className="mono" maxLength={64} />
                  </Cell>
                  <Cell error={e.price} width={130}>
                    <MoneyInput value={v.price} onChange={set(i, "price")} aria-label={`Variant ${i + 1} price`} />
                  </Cell>
                  <Cell error={e.compareAtPrice} width={130}>
                    <MoneyInput value={v.compareAtPrice ?? ""} onChange={set(i, "compareAtPrice")} aria-label={`Variant ${i + 1} was price`} placeholder="optional" />
                  </Cell>
                  <Cell error={e.stock} width={140}>
                    {v.id ? (
                      <span style={{ display: "flex", gap: 6, alignItems: "center", whiteSpace: "nowrap" }}>
                        <strong className="adm-num">{v.stock}</strong>
                        <button type="button" className="link" onClick={(ev) => onAdjust(v, ev.currentTarget)}>
                          Adjust
                        </button>
                        <button type="button" className="link dim" onClick={() => onHistory(v)}>
                          History
                        </button>
                      </span>
                    ) : (
                      <NumberInput min={0} value={v.stock} onChange={set(i, "stock")} aria-label={`Variant ${i + 1} starting stock`} title="Starting stock" />
                    )}
                  </Cell>
                  <Cell error={e.intendedUse}>
                    <TextInput value={v.intendedUse} onChange={set(i, "intendedUse")} aria-label={`Variant ${i + 1} intended use`} placeholder="optional" />
                  </Cell>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button type="button" className="icon-btn adm-icon-sm" title="Duplicate row" aria-label={`Duplicate ${v.name || "variant"}`} onClick={() => dispatch({ type: "duplicateVariant", index: i })}>
                      ⧉
                    </button>{" "}
                    <button
                      type="button"
                      className="icon-btn adm-icon-sm"
                      title={v.ordered ? "Remove (kept for order history)" : "Remove"}
                      aria-label={`Remove ${v.name || "variant"}`}
                      disabled={variations.length === 1}
                      onClick={() => dispatch({ type: "removeVariant", index: i })}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="adm-actions">
        <Button size="sm" onClick={() => dispatch({ type: "addVariant" })}>
          + Add variant
        </Button>
        <span className="adm-hint">New variants take a starting stock. After saving, change stock with Adjust, so every change has a reason.</span>
      </div>
    </div>
  );
}

function Cell({ error, width, children }) {
  return (
    <td style={width ? { minWidth: width } : undefined}>
      {children}
      {error && <p className="adm-error">{error}</p>}
    </td>
  );
}
