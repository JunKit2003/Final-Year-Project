import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { Close } from "../../components/ui/Icons";
import { Button } from "./controls";

/** Modal dialog on the native <dialog> element (focus trap and Esc for free). */
export function Dialog({ title, children, footer, onClose, size = "md", className = "" }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal?.();
    return () => d?.open && d.close?.();
  }, []);
  return createPortal(
    <dialog
      ref={ref}
      className={`adm-dialog adm-dialog--${size} ${className}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose?.();
      }}
      onClick={(e) => e.target === ref.current && onClose?.()}
    >
      <div className="adm-dialog-inner">
        <header className="adm-dialog-head">
          <h2 id={titleId} className="adm-h3">{title}</h2>
          {onClose && (
            <button type="button" className="icon-btn adm-icon-sm" onClick={onClose} aria-label="Close">
              <Close />
            </button>
          )}
        </header>
        <div className="adm-dialog-body">{children}</div>
        {footer && <footer className="adm-dialog-foot">{footer}</footer>}
      </div>
    </dialog>,
    document.body
  );
}

export function ConfirmDialog({ title, children, confirmLabel = "Confirm", cancelLabel = "Cancel", tone = "primary", pending = false, disabled = false, onConfirm, onCancel }) {
  return (
    <Dialog
      title={title}
      onClose={onCancel}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={tone} onClick={onConfirm} loading={pending} disabled={disabled}>{confirmLabel}</Button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}

/** Side panel for histories and details. */
export function Drawer({ title, children, onClose, width = 520 }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return createPortal(
    <div className="adm-drawer-wrap" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <aside className="adm-drawer" style={{ "--w": `${width}px` }} role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined}>
        <header className="adm-dialog-head">
          <h2 className="adm-h3">{title}</h2>
          <button type="button" className="icon-btn adm-icon-sm" onClick={onClose} aria-label="Close">
            <Close />
          </button>
        </header>
        <div className="adm-drawer-body">{children}</div>
      </aside>
    </div>,
    document.body
  );
}

/** Small anchored panel; closes on outside click or Esc. */
export function Popover({ anchor, onClose, children, label }) {
  const ref = useRef(null);
  useEffect(() => {
    const onDown = (e) => !ref.current?.contains(e.target) && !anchor?.contains?.(e.target) && onClose?.();
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [anchor, onClose]);
  const r = anchor?.getBoundingClientRect?.();
  const style = r ? { top: Math.min(r.bottom + 6, window.innerHeight - 20) + window.scrollY, left: Math.max(8, Math.min(r.left + window.scrollX, window.innerWidth - 320)) } : {};
  return createPortal(
    <div ref={ref} className="adm-popover" style={style} role="dialog" aria-label={label}>
      {children}
    </div>,
    document.body
  );
}
