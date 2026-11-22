import { useState } from "react";
import { Link, useParams } from "react-router";
import { adminApi } from "../../lib/adminApi";
import { useAdminQuery } from "../../lib/hooks";
import { formatDate, formatDateTime, rm } from "../../lib/format";
import { Button, Select } from "../../ui/controls";
import { ConfirmDialog } from "../../ui/overlay";
import { BackLink, EmptyState, ErrorNote, PageHeader, Panel, Pill, Skeleton } from "../../ui/layout";
import { STATUS_TONE, paymentLabel } from "../orders/orderUi";
import { useSession, useToast } from "../../../lib/store";

export default function CustomerDetail() {
  const { id } = useParams();
  const toast = useToast();
  const { user } = useSession();
  const q = useAdminQuery(() => adminApi.get(`/customers/${id}`), [id]);
  const [confirm, setConfirm] = useState(null);
  if (q.error && !q.data) return <ErrorNote error={q.error} onRetry={q.reload} />;
  if (!q.data) return <Skeleton />;
  const { customer: c, orders } = q.data;
  const self = String(user?.id) === String(c.id);

  const patch = async (body, done) => {
    try {
      const updated = await adminApi.patch(`/customers/${c.id}`, body);
      q.setData((d) => ({ ...d, customer: { ...d.customer, ...updated } }));
      toast(done);
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setConfirm(null);
    }
  };

  return (
    <>
      <BackLink to="/admin/customers">Customers</BackLink>
      <PageHeader
        title={c.name}
        actions={
          <>
            {!c.isActive && <Pill tone="danger">Deactivated</Pill>}
            {c.isActive ? (
              <Button variant="danger" disabled={self} title={self ? "You can't deactivate your own account" : undefined} onClick={() => setConfirm("deactivate")}>
                Deactivate
              </Button>
            ) : (
              <Button onClick={() => patch({ isActive: true }, "Account reactivated")}>Reactivate</Button>
            )}
          </>
        }
      >
        <p className="muted">
          @{c.username} · joined {formatDate(c.createdAt)}
        </p>
      </PageHeader>
      <div className="adm-grid-2">
        <Panel title="Orders" flush>
          {orders.length === 0 ? (
            <div style={{ padding: 18 }}>
              <EmptyState title="No orders yet" />
            </div>
          ) : (
            <table className="adm-table">
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link className="adm-row-link mono" to={`/admin/orders/${o.id}`}>
                        #{o.id}
                      </Link>
                    </td>
                    <td className="dim">{formatDateTime(o.createdAt)}</td>
                    <td className="num">{rm(o.totalAmount)}</td>
                    <td>
                      <Pill tone={STATUS_TONE[o.status]}>{o.status}</Pill> <Pill tone={o.paymentState}>{paymentLabel(o.paymentState)}</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        <aside>
          <Panel title="Details">
            <dl className="adm-kv">
              <dt>Email</dt>
              <dd>
                <a className="link" href={`mailto:${c.email}`}>
                  {c.email}
                </a>
              </dd>
              <dt>Phone</dt>
              <dd>{c.phone || "—"}</dd>
              <dt>Orders</dt>
              <dd>{c.orderCount}</dd>
              <dt>Spent</dt>
              <dd>{rm(c.spent)}</dd>
            </dl>
          </Panel>
          <Panel title="Role" description="Admins can open this admin area.">
            <Select value={c.category} disabled={self} onChange={(v) => (v === "Admin" ? setConfirm("promote") : patch({ category: "Customer" }, "Admin access removed"))} options={[["Customer", "Customer"], ["Admin", "Admin"]]} aria-label="Role" />
            {self && <p className="adm-hint">You can&apos;t change your own role.</p>}
          </Panel>
        </aside>
      </div>
      {confirm === "deactivate" && (
        <ConfirmDialog title={`Deactivate ${c.name}?`} confirmLabel="Deactivate" tone="danger" onCancel={() => setConfirm(null)} onConfirm={() => patch({ isActive: false }, "Account deactivated")}>
          They&apos;re signed out and can&apos;t sign in again until you reactivate them. Their orders are kept.
        </ConfirmDialog>
      )}
      {confirm === "promote" && (
        <ConfirmDialog title={`Make ${c.name} an admin?`} confirmLabel="Make admin" onCancel={() => setConfirm(null)} onConfirm={() => patch({ category: "Admin" }, `${c.name} is now an admin`)}>
          Admins can change products, prices, orders, refunds and every page of the site.
        </ConfirmDialog>
      )}
    </>
  );
}
