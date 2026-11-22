import { Link } from "react-router";

export function PageHeader({ kicker, title, actions, children }) {
  return (
    <header className="adm-page-head">
      <div>
        {kicker && <p className="kicker">{kicker}</p>}
        <h1 className="adm-h1">{title}</h1>
        {children}
      </div>
      {actions && <div className="adm-actions">{actions}</div>}
    </header>
  );
}

export function Panel({ title, description, actions, children, className = "", flush = false }) {
  return (
    <section className={`adm-panel ${flush ? "adm-panel--flush" : ""} ${className}`}>
      {(title || actions) && (
        <header className="adm-panel-head">
          <div>
            {title && <h2 className="adm-h3">{title}</h2>}
            {description && <p className="adm-hint">{description}</p>}
          </div>
          {actions && <div className="adm-actions">{actions}</div>}
        </header>
      )}
      <div className="adm-panel-body">{children}</div>
    </section>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="adm-empty">
      <h3 className="adm-h3">{title}</h3>
      {children && <p className="muted">{children}</p>}
      {action}
    </div>
  );
}

const TONES = { live: "ok", paid: "ok", completed: "ok", in: "ok", draft: "warn", pending: "warn", low: "warn", partly_refunded: "warn", shipped: "info", archived: "dim", cancelled: "dim", unpaid: "dim", out: "danger", refunded: "danger", failed: "danger", succeeded: "ok" };

export function Pill({ tone, children, title }) {
  const t = TONES[tone] || tone || "dim";
  return (
    <span className={`adm-pill adm-pill--${t}`} title={title}>
      {children}
    </span>
  );
}

export function ErrorNote({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="alert alert-error adm-error-note" role="alert">
      <span>{error.message}</span>
      {onRetry && (
        <button type="button" className="link" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Pager({ page, pageSize, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav className="adm-pager" aria-label="Pages">
      <button type="button" className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </button>
      <span className="mono dim">
        Page {page} of {pages}
      </span>
      <button type="button" className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Next
      </button>
    </nav>
  );
}

export const Skeleton = ({ rows = 4 }) => (
  <div className="adm-skeleton" aria-busy="true" aria-label="Loading">
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="skeleton" />
    ))}
  </div>
);

export const BackLink = ({ to, children }) => (
  <Link to={to} className="adm-back mono">
    ← {children}
  </Link>
);

/** Sticky bottom bar on edit screens. */
export function SaveBar({ dirty, saving, onSave, onDiscard, children, saveLabel = "Save" }) {
  return (
    <div className={`adm-savebar ${dirty ? "is-dirty" : ""}`} role="region" aria-label="Save changes">
      <span className="mono">{dirty ? "Unsaved changes" : "All changes saved"}</span>
      <div className="adm-actions">
        {children}
        <button type="button" className="btn btn-ghost btn-sm" onClick={onDiscard} disabled={!dirty || saving}>
          Discard
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={onSave} disabled={!dirty || saving} aria-busy={saving || undefined}>
          {saving ? "Saving…" : saveLabel}
        </button>
      </div>
    </div>
  );
}
