import { cloneElement, isValidElement, useId, useMemo, useRef, useState } from "react";

export function Button({ variant = "ghost", size, loading = false, disabled, icon, children, className = "", type = "button", ...rest }) {
  const v = { primary: "btn-primary", ghost: "btn-ghost", danger: "btn-danger", quiet: "adm-btn-quiet" }[variant] || "btn-ghost";
  return (
    <button type={type} className={`btn ${v} ${size === "sm" ? "btn-sm" : ""} adm-btn ${loading ? "is-loading" : ""} ${className}`} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <span className="adm-spinner" aria-hidden /> : icon}
      {children}
    </button>
  );
}

/** Label + control + hint/error. The child gets id, aria-invalid and aria-describedby. */
export function Field({ label, hint, error, children, className = "", inline = false }) {
  const id = useId();
  const msgId = `${id}-msg`;
  const child = isValidElement(children)
    ? cloneElement(children, { id: children.props.id || id, "aria-invalid": error ? true : undefined, "aria-describedby": error || hint ? msgId : undefined })
    : children;
  return (
    <div className={`adm-field ${inline ? "adm-field--inline" : ""} ${error ? "has-error" : ""} ${className}`}>
      {label && <label htmlFor={children?.props?.id || id}>{label}</label>}
      {child}
      {(error || hint) && (
        <p id={msgId} className={error ? "adm-error" : "adm-hint"}>
          {error || hint}
        </p>
      )}
    </div>
  );
}

export const TextInput = ({ value, onChange, className = "", ...rest }) => (
  <input className={`adm-input ${className}`} value={value ?? ""} onChange={(e) => onChange?.(e.target.value)} {...rest} />
);

export const TextArea = ({ value, onChange, rows = 4, className = "", ...rest }) => (
  <textarea className={`adm-input adm-textarea ${className}`} rows={rows} value={value ?? ""} onChange={(e) => onChange?.(e.target.value)} {...rest} />
);

export const Select = ({ value, onChange, options, className = "", ...rest }) => (
  <select className={`adm-input adm-select ${className}`} value={value ?? ""} onChange={(e) => onChange?.(e.target.value)} {...rest}>
    {options.map((o) => {
      const [v, l] = Array.isArray(o) ? o : [o, o];
      return (
        <option key={v} value={v}>
          {l}
        </option>
      );
    })}
  </select>
);

export function Toggle({ checked, onChange, label, id, disabled }) {
  const auto = useId();
  return (
    <label className={`adm-toggle ${disabled ? "is-disabled" : ""}`} htmlFor={id || auto}>
      <input id={id || auto} type="checkbox" role="switch" checked={!!checked} disabled={disabled} onChange={(e) => onChange?.(e.target.checked)} />
      <span className="adm-toggle-track" aria-hidden>
        <span />
      </span>
      {label && <span>{label}</span>}
    </label>
  );
}

/** Number input that reports numbers (or "" while empty). */
export function NumberInput({ value, onChange, min, max, step = 1, className = "", ...rest }) {
  return (
    <input
      type="number"
      inputMode={step === 1 ? "numeric" : "decimal"}
      className={`adm-input adm-num ${className}`}
      value={value ?? ""}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange?.(e.target.value === "" ? "" : Number(e.target.value))}
      {...rest}
    />
  );
}

export function MoneyInput(props) {
  return (
    <span className="adm-money">
      <span className="mono dim">RM</span>
      <NumberInput step={0.01} min={0} {...props} />
    </span>
  );
}

/**
 * Text input with suggestions. Matching is case-insensitive; "Create '<text>'" is offered
 * only when nothing matches exactly.
 */
export function Combobox({ value, onChange, options = [], placeholder, createLabel = (t) => `Create '${t}'`, ...rest }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const blurTimer = useRef(null);
  const q = String(value || "").trim().toLowerCase();
  const matches = useMemo(() => options.filter((o) => o.toLowerCase().includes(q)).slice(0, 8), [options, q]);
  const exact = options.some((o) => o.toLowerCase() === q);
  const items = [...matches.map((m) => ({ label: m, value: m })), ...(q && !exact ? [{ label: createLabel(value.trim()), value: value.trim(), create: true }] : [])];
  const pick = (v) => {
    onChange(v);
    setOpen(false);
  };
  return (
    <div className="adm-combo">
      <input
        className="adm-input"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => (blurTimer.current = setTimeout(() => setOpen(false), 120))}
        onKeyDown={(e) => {
          if (!open || !items.length) return;
          if (e.key === "ArrowDown") (e.preventDefault(), setActive((a) => (a + 1) % items.length));
          if (e.key === "ArrowUp") (e.preventDefault(), setActive((a) => (a - 1 + items.length) % items.length));
          if (e.key === "Enter") (e.preventDefault(), pick(items[active].value));
        }}
        {...rest}
      />
      {open && items.length > 0 && (
        <ul id={listId} role="listbox" className="adm-combo-list" onMouseDown={() => clearTimeout(blurTimer.current)}>
          {items.map((it, i) => (
            <li key={it.label} role="option" aria-selected={i === active} className={`${i === active ? "is-active" : ""} ${it.create ? "is-create" : ""}`} onMouseDown={(e) => (e.preventDefault(), pick(it.value))}>
              {it.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder, label = placeholder }) {
  return (
    <div className="adm-search">
      <svg viewBox="0 0 24 24" aria-hidden width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-4-4" />
      </svg>
      <input type="search" className="adm-input" value={value ?? ""} placeholder={placeholder} aria-label={label} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
