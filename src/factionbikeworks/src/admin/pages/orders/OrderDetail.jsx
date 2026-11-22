import { useState } from "react";
import { Link, useParams } from "react-router";
import { adminApi } from "../../lib/adminApi";
import { useAdminQuery } from "../../lib/hooks";
import { formatDateTime, rm } from "../../lib/format";
import { Button, TextArea } from "../../ui/controls";
import { BackLink, ErrorNote, PageHeader, Panel, Pill, Skeleton } from "../../ui/layout";
import { CancelDialog, RefundDialog, ShipDialog } from "./OrderDialogs";
import { STATUS_TONE, paymentLabel } from "./orderUi";
import { useToast } from "../../../lib/store";

const PENDING_COPY = (amount) => `Refund of ${rm(amount)} requested; waiting for Stripe to confirm.`;

export default function OrderDetail() {
  const { id } = useParams();
  const toast = useToast();
  const q = useAdminQuery(() => adminApi.get(`/orders/${id}`), [id]);
  const [dialog, setDialog] = useState(null);
  const [pending, setPending] = useState(false);
  const [dialogError, setDialogError] = useState(null);

  if (q.error && !q.data) return <ErrorNote error={q.error} onRetry={q.reload} />;
  if (!q.data) return <Skeleton rows={8} />;
  const { order, items, customer, refunds, events, notes, actions, pendingRefund } = q.data;
  const pendingAmount = refunds.find((r) => r.status === "pending")?.amount;

  const act = async (path, body, success) => {
    setPending(true);
    setDialogError(null);
    try {
      const d = await adminApi.post(`/orders/${id}/${path}`, { version: order.version, ...body });
      q.setData(d);
      setDialog(null);
      toast(typeof success === "function" ? success(d) : success);
    } catch (e) {
      if (e.code === "version_conflict") {
        toast(e.message, "error");
        setDialog(null);
        q.reload();
      } else if (e.errors) setDialogError(Object.values(e.errors)[0]);
      else toast(e.message, "error");
    } finally {
      setPending(false);
    }
  };

  const refundToast = (r) => (r?.status === "pending" ? PENDING_COPY(r.amount) : r?.status === "failed" ? `Refund failed: ${r.error || "Stripe declined it"}` : r ? `Refunded ${rm(r.amount)}` : null);

  return (
    <>
      <BackLink to="/admin/orders">Orders</BackLink>
      <PageHeader
        title={
          <>
            Order <span className="mono">#{order.id}</span>
          </>
        }
        actions={
          <>
            <Pill tone={STATUS_TONE[order.status]}>{order.status}</Pill>
            <Pill tone={order.paymentState} title="Payment">Payment: {paymentLabel(order.paymentState)}</Pill>
            {actions.includes("ship") && <Button variant="primary" onClick={() => setDialog("ship")}>Mark shipped</Button>}
            {actions.includes("complete") && <Button variant="primary" onClick={() => act("complete", {}, "Order completed")} loading={pending && !dialog}>Mark completed</Button>}
            {actions.includes("reopen") && <Button onClick={() => act("reopen", {}, "Order reopened")}>Reopen</Button>}
            {actions.includes("refund") && <Button onClick={() => setDialog("refund")}>Refund</Button>}
            {!actions.includes("refund") && order.refundable > 0 && !order.canRefundOnline && <span className="adm-hint">Refund this order in the Stripe dashboard.</span>}
            {actions.includes("cancel") && <Button variant="danger" onClick={() => setDialog("cancel")}>Cancel order</Button>}
          </>
        }
      >
        <p className="muted">Placed {formatDateTime(order.createdAt)}</p>
      </PageHeader>

      {pendingRefund && (
        <div className="adm-banner" role="status">
          {PENDING_COPY(pendingAmount)} New refunds and cancellations are paused until it&apos;s confirmed.
          <Button size="sm" onClick={q.reload}>Check again</Button>
        </div>
      )}

      <div className="adm-grid-2">
        <div className="adm-stack">
          <Panel title="Items" flush>
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="num">Qty</th>
                  <th className="num">Price</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id}>
                    <td>
                      {i.productId ? (
                        <Link className="adm-row-link" to={`/admin/products/${i.productId}`}>
                          {i.productName}
                        </Link>
                      ) : (
                        <strong>{i.productName}</strong>
                      )}{" "}
                      <span className="dim">{i.variationName}</span>
                      <div className="mono dim" style={{ fontSize: 11 }}>
                        {i.sku}
                      </div>
                    </td>
                    <td className="num">{i.quantity}</td>
                    <td className="num">{rm(i.price)}</td>
                    <td className="num">{rm(i.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Panel title="Charges">
            <dl className="adm-kv">
              <dt>Order total</dt>
              <dd>{rm(order.totalAmount)}</dd>
              <dt>Paid</dt>
              <dd>{rm(order.paidAmount)}</dd>
              <dt>Refunded</dt>
              <dd>{order.refundedAmount ? `-${rm(order.refundedAmount)}` : rm(0)}</dd>
              <dt>
                <strong>Net</strong>
              </dt>
              <dd>
                <strong>{rm(order.paidAmount - order.refundedAmount)}</strong>
              </dd>
            </dl>
          </Panel>

          {refunds.length > 0 && (
            <Panel title="Payments & refunds" flush>
              <table className="adm-table">
                <tbody>
                  {refunds.map((r) => (
                    <tr key={r.id}>
                      <td>
                        Refund: {r.reason}
                        <div className="adm-hint">
                          {formatDateTime(r.createdAt)} · {r.actorName || "Admin"}
                          {r.error ? ` · ${r.error}` : ""}
                        </div>
                      </td>
                      <td>
                        <Pill tone={r.status}>{r.status === "succeeded" ? "Refunded" : r.status === "pending" ? "Pending" : "Failed"}</Pill>
                      </td>
                      <td className="num">-{rm(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          )}

          <Panel title="Timeline">
            <ol className="adm-timeline">
              {events.map((e) => (
                <li key={e.id} className={`${e.type === "status" ? "is-status" : ""} ${e.ok === false ? "is-bad" : ""}`}>
                  <div>
                    {e.type === "status" ? (
                      <strong>{e.fromStatus ? `${e.fromStatus} → ${e.toStatus}` : e.toStatus}</strong>
                    ) : (
                      <span>{e.note}</span>
                    )}
                    {e.type === "status" && e.note && <span className="muted"> · {e.note}</span>}
                    <time dateTime={e.createdAt}>
                      {formatDateTime(e.createdAt)} · {e.actorName || "Shop"}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <aside>
          <Panel title="Customer">
            <div className="adm-stack" style={{ gap: 6 }}>
              <strong>{order.recipientName}</strong>
              {customer && (
                <Link className="link" to={`/admin/customers/${customer.id}`}>
                  {customer.email}
                </Link>
              )}
              <a className="link" href={`tel:${order.phoneNumber}`}>
                {order.phoneNumber}
              </a>
              <p className="muted" style={{ whiteSpace: "pre-line" }}>
                {order.shippingAddress}
              </p>
              {(order.courier || order.trackingNumber) && (
                <p className="mono" style={{ fontSize: 12.5 }}>
                  {[order.courier, order.trackingNumber].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </Panel>
          <NotesPanel orderId={order.id} notes={notes} onAdded={(n) => q.setData((d) => ({ ...d, notes: [n, ...d.notes] }))} />
        </aside>
      </div>

      {dialog === "ship" && <ShipDialog order={order} pending={pending} onClose={() => setDialog(null)} onSubmit={(b) => act("ship", b, "Marked shipped")} />}
      {dialog === "refund" && (
        <RefundDialog order={order} pending={pending} error={dialogError} onClose={() => setDialog(null)} onSubmit={(b) => act("refunds", b, (d) => refundToast(d.refund))} />
      )}
      {dialog === "cancel" && (
        <CancelDialog
          order={order}
          pending={pending}
          error={dialogError}
          onClose={() => setDialog(null)}
          onSubmit={(b) => act("cancel", b, (d) => (d.refund ? `Cancelled. ${refundToast(d.refund)}` : "Order cancelled"))}
        />
      )}
    </>
  );
}

function NotesPanel({ orderId, notes, onAdded }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const add = async () => {
    setSaving(true);
    try {
      onAdded(await adminApi.post(`/orders/${orderId}/notes`, { note: text }));
      setText("");
    } catch (e) {
      toast(e.errors?.note || e.message, "error");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Panel title="Internal notes" description="Only admins can see these.">
      <div className="adm-stack">
        {notes.length === 0 && <p className="adm-hint">No notes yet.</p>}
        {notes.map((n) => (
          <div key={n.id}>
            <p style={{ whiteSpace: "pre-line" }}>{n.note}</p>
            <p className="adm-hint">
              {n.actorName} · {formatDateTime(n.createdAt)}
            </p>
          </div>
        ))}
        <label className="sr-only" htmlFor={`note-${orderId}`}>
          Add an internal note
        </label>
        <TextArea id={`note-${orderId}`} rows={2} value={text} onChange={setText} placeholder="Add a note for the team…" maxLength={1000} />
        <div>
          <Button size="sm" onClick={add} loading={saving} disabled={!text.trim()}>
            Add note
          </Button>
        </div>
      </div>
    </Panel>
  );
}
