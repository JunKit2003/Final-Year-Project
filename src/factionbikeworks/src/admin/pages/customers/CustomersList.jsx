import { Link, useSearchParams } from "react-router";
import { adminApi } from "../../lib/adminApi";
import { useAdminQuery, useDebounced } from "../../lib/hooks";
import { formatDate, rm } from "../../lib/format";
import { SearchInput, Select } from "../../ui/controls";
import { EmptyState, ErrorNote, PageHeader, Pager, Pill, Skeleton } from "../../ui/layout";

export default function CustomersList() {
  const [params, setParams] = useSearchParams();
  const get = (k) => params.get(k) || "";
  const set = (k, v) => {
    const next = new URLSearchParams(params);
    v ? next.set(k, v) : next.delete(k);
    if (k !== "page") next.delete("page");
    setParams(next, { replace: true });
  };
  const q = useDebounced(get("q"));
  const page = Number(get("page")) || 1;
  const list = useAdminQuery(() => adminApi.get("/customers", { q, role: get("role"), active: get("active"), page }), [q, get("role"), get("active"), page]);
  return (
    <>
      <PageHeader kicker="People" title="Customers" />
      <div className="adm-toolbar">
        <SearchInput value={get("q")} onChange={(v) => set("q", v)} placeholder="Search name, username, email or phone" />
        <Select value={get("role")} onChange={(v) => set("role", v)} options={[["", "Everyone"], ["Customer", "Customers"], ["Admin", "Admins"]]} aria-label="Role" />
        <Select value={get("active")} onChange={(v) => set("active", v)} options={[["", "Active and deactivated"], ["true", "Active"], ["false", "Deactivated"]]} aria-label="Status" />
      </div>
      <ErrorNote error={list.error} onRetry={list.reload} />
      {list.loading && !list.data && <Skeleton />}
      {list.data && !list.data.items.length && <EmptyState title="No matching customers">Try a different search.</EmptyState>}
      {list.data?.items.length > 0 && (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Joined</th>
                <th className="num">Orders</th>
                <th className="num">Spent</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {list.data.items.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link className="adm-row-link" to={`/admin/customers/${c.id}`}>
                      {c.name}
                    </Link>
                    <div className="mono dim" style={{ fontSize: 11.5 }}>
                      @{c.username}
                    </div>
                  </td>
                  <td>{c.email}</td>
                  <td className="dim">{formatDate(c.createdAt)}</td>
                  <td className="num">{c.orderCount}</td>
                  <td className="num">{rm(c.spent)}</td>
                  <td>
                    <Pill tone={c.category === "Admin" ? "info" : "dim"}>{c.category}</Pill> {!c.isActive && <Pill tone="danger">Deactivated</Pill>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {list.data && <Pager page={page} pageSize={25} total={list.data.total} onPage={(n) => set("page", String(n))} />}
    </>
  );
}
