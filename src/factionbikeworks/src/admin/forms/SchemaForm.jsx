// Renders any settings group from src/shared/site-schema.js. Values and errors are keyed by
// dotted path, matching what the API returns.
import { useState } from "react";
import { ICONS } from "../../../../shared/site-schema.js";
import { adminApi } from "../lib/adminApi";
import { Button, Field, NumberInput, Select, TextArea, TextInput, Toggle } from "../ui/controls";
import { ImageDrop } from "../ui/ImageDrop";
import { assetUrl } from "../../lib/api";
import { useToast } from "../../lib/store";
import { getAt, setAt } from "./paths";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function SchemaForm({ fields, value, onChange, errors = {}, prefix = "", skip = [], row = false }) {
  return (
    <div className={row ? "adm-cols" : "adm-stack"}>
      {Object.entries(fields)
        .filter(([name]) => !skip.includes(name))
        .map(([name, field]) => {
          const path = prefix ? `${prefix}.${name}` : name;
          return <SchemaField key={path} field={field} path={path} value={getAt(value, name)} onChange={(v) => onChange(setAt(value, name, v))} errors={errors} />;
        })}
    </div>
  );
}

function Counter({ value, max }) {
  if (!max) return null;
  const n = String(value || "").length;
  return <span className={`mono ${n > max ? "adm-error" : "dim"}`} style={{ fontSize: 11 }}>{n}/{max}</span>;
}

function SchemaField({ field, path, value, onChange, errors }) {
  const error = errors[path];
  const hint = field.help || (field.placeholders ? `Placeholders: ${field.placeholders.map((p) => `{{${p}}}`).join(" ")}` : undefined);
  const label = (
    <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
      <span>{field.label}</span>
      {(field.type === "text" || field.type === "textarea") && <Counter value={value} max={field.max} />}
    </span>
  );
  switch (field.type) {
    case "text":
    case "url":
    case "link":
      return (
        <Field label={label} error={error} hint={hint || (field.type === "link" ? "A page on this site (/catalog) or a full https:// link" : undefined)}>
          <TextInput value={value} onChange={onChange} placeholder={field.type === "url" ? "https://" : undefined} type={field.type === "url" ? "url" : "text"} />
        </Field>
      );
    case "textarea":
      return (
        <Field label={label} error={error} hint={hint}>
          <TextArea value={value} onChange={onChange} rows={field.max > 1000 ? 9 : 3} />
        </Field>
      );
    case "bool":
      return <Toggle checked={value} onChange={onChange} label={field.label} />;
    case "number":
      return (
        <Field label={field.label} error={error}>
          <NumberInput value={value} onChange={onChange} min={field.min} max={field.max} style={{ maxWidth: 160 }} />
        </Field>
      );
    case "color":
      return (
        <Field label={field.label} error={error}>
          <span className="adm-color">
            <input type="color" value={/^#[0-9a-f]{6}$/i.test(value || "") ? value : "#000000"} onChange={(e) => onChange(e.target.value)} aria-label={`${field.label} colour picker`} />
            <TextInput value={value} onChange={onChange} className="mono" style={{ maxWidth: 130 }} maxLength={7} />
          </span>
        </Field>
      );
    case "icon":
      return (
        <Field label={field.label} error={error}>
          <Select value={value} onChange={onChange} options={ICONS.map((i) => [i, i[0].toUpperCase() + i.slice(1)])} />
        </Field>
      );
    case "image":
      return <ImageField field={field} value={value} onChange={onChange} error={error} />;
    case "object":
      return (
        <fieldset className="adm-list-item" style={{ margin: 0 }}>
          <legend className="adm-h3" style={{ padding: "0 6px" }}>
            {field.label}
          </legend>
          <SchemaForm fields={field.fields} value={value || {}} onChange={onChange} errors={errors} prefix={path} />
        </fieldset>
      );
    case "list":
      return <ListField field={field} path={path} value={value || []} onChange={onChange} errors={errors} error={error} />;
    case "hours":
      return <HoursField value={value || []} onChange={onChange} errors={errors} path={path} label={field.label} />;
    case "dates":
      return <DatesField value={value || []} onChange={onChange} errors={errors} path={path} label={field.label} max={field.maxItems} />;
    default:
      return null;
  }
}

function ListField({ field, path, value, onChange, errors, error }) {
  const keys = Object.keys(field.of);
  // Short rows of simple fields (menu links, hours lines, page titles) sit on one line.
  const single = keys.length <= 3 && Object.values(field.of).every((f) => ["text", "link", "url", "icon"].includes(f.type));
  const blank = Object.fromEntries(Object.entries(field.of).map(([k, f]) => [k, f.type === "bool" ? false : f.type === "icon" ? "wrench" : ""]));
  const move = (from, to) => {
    const out = [...value];
    const [x] = out.splice(from, 1);
    out.splice(to, 0, x);
    onChange(out);
  };
  return (
    <div className="adm-field">
      <label>{field.label}</label>
      <div className="adm-stack" style={{ gap: 8 }}>
        {value.map((item, i) => (
          <div key={i} className={single ? "adm-row" : "adm-list-item"} style={single ? { alignItems: "flex-start", flexWrap: "nowrap" } : undefined}>
            {!single && (
              <div className="adm-list-item-head">
                <span>
                  {field.label.replace(/s$/, "")} {i + 1}
                </span>
                <ItemTools i={i} n={value.length} onMove={move} onRemove={() => onChange(value.filter((_, k) => k !== i))} min={field.minItems} />
              </div>
            )}
            <div style={single ? { flex: "1 1 auto" } : undefined}>
              <SchemaForm fields={field.of} value={item} onChange={(v) => onChange(value.map((x, k) => (k === i ? v : x)))} errors={errors} prefix={`${path}.${i}`} row={single && keys.length > 1} />
            </div>
            {single && <ItemTools i={i} n={value.length} onMove={move} onRemove={() => onChange(value.filter((_, k) => k !== i))} min={field.minItems} />}
          </div>
        ))}
        <div>
          <Button size="sm" onClick={() => onChange([...value, blank])} disabled={value.length >= field.maxItems}>
            + Add
          </Button>
        </div>
      </div>
      {error && <p className="adm-error">{error}</p>}
    </div>
  );
}

function ItemTools({ i, n, onMove, onRemove, min }) {
  return (
    <span style={{ display: "flex", gap: 4, flex: "0 0 auto" }}>
      <button type="button" className="icon-btn adm-icon-sm" aria-label="Move up" disabled={i === 0} onClick={() => onMove(i, i - 1)}>
        ↑
      </button>
      <button type="button" className="icon-btn adm-icon-sm" aria-label="Move down" disabled={i === n - 1} onClick={() => onMove(i, i + 1)}>
        ↓
      </button>
      <button type="button" className="icon-btn adm-icon-sm" aria-label="Remove" disabled={n <= min} onClick={onRemove}>
        ×
      </button>
    </span>
  );
}

function ImageField({ field, value, onChange, error }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const upload = async ([file]) => {
    setBusy(true);
    try {
      const r = await adminApi.upload("/settings/upload", file);
      onChange(r.url);
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="adm-field">
      <label>{field.label}</label>
      <div className="adm-photos">
        {value && (
          <div className="adm-photo" style={{ width: 160, height: 100, cursor: "default" }}>
            <img src={assetUrl(value)} alt="" />
            <button type="button" aria-label="Remove image" onClick={() => onChange("")}>
              ×
            </button>
          </div>
        )}
        <ImageDrop multiple={false} compact label={busy ? "Uploading…" : value ? "Replace" : "Upload"} disabled={busy} onFiles={upload} onError={(m) => toast(m, "error")} />
      </div>
      {error && <p className="adm-error">{error}</p>}
    </div>
  );
}

function HoursField({ value, onChange, errors, path, label }) {
  const set = (i, patch) => onChange(value.map((d, k) => (k === i ? { ...d, ...patch } : d)));
  return (
    <div className="adm-field">
      <label>{label}</label>
      <div className="adm-table-wrap">
        <table className="adm-table">
          <tbody>
            {DAYS.map((day, i) => {
              const d = value[i] || { closed: true, open: "", close: "" };
              return (
                <tr key={day}>
                  <td style={{ width: 120 }}>
                    <strong>{day}</strong>
                  </td>
                  <td style={{ width: 120 }}>
                    <Toggle checked={!d.closed} onChange={(on) => set(i, on ? { closed: false, open: d.open || "11:00", close: d.close || "19:00" } : { closed: true })} label={d.closed ? "Closed" : "Open"} />
                  </td>
                  <td>
                    {!d.closed && (
                      <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <TextInput type="time" value={d.open} onChange={(v) => set(i, { open: v })} aria-label={`${day} opens`} style={{ width: 130 }} />
                        <span className="dim">to</span>
                        <TextInput type="time" value={d.close} onChange={(v) => set(i, { close: v })} aria-label={`${day} closes`} style={{ width: 130 }} />
                      </span>
                    )}
                    {errors[`${path}.${i}`] && <p className="adm-error">{errors[`${path}.${i}`]}</p>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="adm-hint">These drive the “Open now” badge, in Malaysia time.</p>
    </div>
  );
}

function DatesField({ value, onChange, errors, path, label, max }) {
  return (
    <div className="adm-field">
      <label>{label}</label>
      <div className="adm-stack" style={{ gap: 8 }}>
        {value.length === 0 && <p className="adm-hint">Public holidays or days off. The badge says “Closed today: reason”.</p>}
        {value.map((d, i) => (
          <div key={i} className="adm-row" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
            <span style={{ flex: "0 0 170px" }}>
              <TextInput type="date" value={d.date} onChange={(v) => onChange(value.map((x, k) => (k === i ? { ...x, date: v } : x)))} aria-label={`Closed date ${i + 1}`} />
              {errors[`${path}.${i}.date`] && <p className="adm-error">{errors[`${path}.${i}.date`]}</p>}
            </span>
            <span style={{ flex: "1 1 auto" }}>
              <TextInput value={d.reason} onChange={(v) => onChange(value.map((x, k) => (k === i ? { ...x, reason: v } : x)))} placeholder="Christmas ride" maxLength={60} aria-label={`Reason ${i + 1}`} />
            </span>
            <button type="button" className="icon-btn adm-icon-sm" aria-label={`Remove date ${i + 1}`} onClick={() => onChange(value.filter((_, k) => k !== i))}>
              ×
            </button>
          </div>
        ))}
        <div>
          <Button size="sm" onClick={() => onChange([...value, { date: "", reason: "" }])} disabled={value.length >= max}>
            + Add closed date
          </Button>
        </div>
      </div>
    </div>
  );
}
