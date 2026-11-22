import { Button, TextInput } from "../../ui/controls";

export function SpecsEditor({ specs, onChange, errors = {} }) {
  const set = (i, field, value) => onChange(specs.map((s, k) => (k === i ? { ...s, [field]: value } : s)));
  return (
    <div className="adm-stack">
      {specs.length === 0 && <p className="adm-hint">Specs show as a table on the product page, e.g. Weight · 435 g.</p>}
      {specs.map((s, i) => (
        <div key={i} className="adm-row" style={{ alignItems: "flex-start" }}>
          <div>
            <TextInput value={s.label} onChange={(v) => set(i, "label", v)} placeholder="Weight" aria-label={`Spec ${i + 1} label`} maxLength={60} />
            {errors[`specs.${i}.label`] && <p className="adm-error">{errors[`specs.${i}.label`]}</p>}
          </div>
          <div style={{ flex: "2 1 240px" }}>
            <TextInput value={s.value} onChange={(v) => set(i, "value", v)} placeholder="435 g" aria-label={`Spec ${i + 1} value`} maxLength={200} />
            {errors[`specs.${i}.value`] && <p className="adm-error">{errors[`specs.${i}.value`]}</p>}
          </div>
          <button type="button" className="icon-btn adm-icon-sm" style={{ flex: "0 0 auto" }} aria-label={`Remove spec ${i + 1}`} onClick={() => onChange(specs.filter((_, k) => k !== i))}>
            ×
          </button>
        </div>
      ))}
      <div>
        <Button size="sm" onClick={() => onChange([...specs, { label: "", value: "" }])} disabled={specs.length >= 30}>
          + Add spec
        </Button>
      </div>
    </div>
  );
}
