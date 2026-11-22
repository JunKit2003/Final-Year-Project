import { useState } from "react";
import { rm } from "../../lib/format";
import { Button, Field, MoneyInput, TextArea, TextInput, Toggle } from "../../ui/controls";
import { Dialog } from "../../ui/overlay";
import { refundError } from "./orderUi";

export function ShipDialog({ order, onClose, onSubmit, pending }) {
  const [courier, setCourier] = useState("");
  const [trackingNumber, setTracking] = useState("");
  return (
    <Dialog
      title={`Mark #${order.id} shipped`}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={pending} onClick={() => onSubmit({ courier, trackingNumber })}>Mark shipped</Button>
        </>
      }
    >
      <Field label="Courier (optional)">
        <TextInput value={courier} onChange={setCourier} placeholder="J&T" maxLength={60} autoFocus />
      </Field>
      <Field label="Tracking number (optional)">
        <TextInput value={trackingNumber} onChange={setTracking} maxLength={80} className="mono" />
      </Field>
      <p className="adm-hint">The customer gets the “Order shipped” email.</p>
    </Dialog>
  );
}

export function RefundDialog({ order, onClose, onSubmit, pending, error }) {
  const [amount, setAmount] = useState(order.refundable);
  const [reason, setReason] = useState("");
  const problem = refundError(amount, order.refundable);
  return (
    <Dialog
      title="Issue a refund"
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={pending} disabled={!!problem || !reason.trim()} onClick={() => onSubmit({ amount, reason })}>
            Refund {problem ? "" : rm(amount)}
          </Button>
        </>
      }
    >
      <dl className="adm-kv">
        <dt>Paid</dt>
        <dd>{rm(order.paidAmount)}</dd>
        <dt>Already refunded</dt>
        <dd>{rm(order.refundedAmount)}</dd>
      </dl>
      <Field label="Amount" hint={`Refundable: ${rm(order.refundable)}`} error={amount !== "" && problem ? problem : error}>
        <MoneyInput value={amount} onChange={setAmount} autoFocus />
      </Field>
      <Field label="Reason">
        <TextArea rows={2} value={reason} onChange={setReason} placeholder="Goodwill: scratched box" maxLength={300} />
      </Field>
      <p className="adm-hint">Refunded to the customer&apos;s card through Stripe. They&apos;re emailed when it goes through.</p>
    </Dialog>
  );
}

export function CancelDialog({ order, onClose, onSubmit, pending, error }) {
  const canRefund = order.refundable > 0 && order.canRefundOnline;
  const [amount, setAmount] = useState(canRefund ? order.refundable : 0);
  const [reason, setReason] = useState("");
  const [restock, setRestock] = useState(true);
  const problem = amount === 0 || amount === "" ? null : refundError(amount, order.refundable);
  return (
    <Dialog
      title={`Cancel order #${order.id}?`}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Keep order</Button>
          <Button variant="danger" loading={pending} disabled={!reason.trim() || !!problem} onClick={() => onSubmit({ reason, refundAmount: Number(amount) || 0, restock })}>
            Cancel order
          </Button>
        </>
      }
    >
      {order.status === "Pending" ? (
        <p className="muted">It hasn&apos;t been paid. Its held stock goes back on the shelf.</p>
      ) : (
        <>
          <dl className="adm-kv">
            <dt>Paid</dt>
            <dd>{rm(order.paidAmount)}</dd>
            <dt>Already refunded</dt>
            <dd>{rm(order.refundedAmount)}</dd>
          </dl>
          {canRefund ? (
            <Field label={`Refund amount (up to ${rm(order.refundable)})`} error={problem || error}>
              <MoneyInput value={amount} onChange={setAmount} />
            </Field>
          ) : (
            order.refundable > 0 && <p className="adm-banner">Refund this order in the Stripe dashboard.</p>
          )}
          <Toggle checked={restock} onChange={setRestock} label="Put items back in stock" />
        </>
      )}
      <Field label="Reason">
        <TextArea rows={2} value={reason} onChange={setReason} placeholder="Customer asked to cancel" maxLength={300} autoFocus />
      </Field>
    </Dialog>
  );
}
