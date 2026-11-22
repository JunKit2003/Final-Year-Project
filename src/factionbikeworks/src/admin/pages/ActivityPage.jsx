import { useSearchParams } from "react-router";
import { adminApi } from "../lib/adminApi";
import { useAdminQuery } from "../lib/hooks";
import { formatDateTime } from "../lib/format";
import { EmptyState, ErrorNote, PageHeader, Pager, Skeleton } from "../ui/layout";

export default function ActivityPage() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page")) || 1;
  const q = useAdminQuery(() => adminApi.get("/activity", { page }), [page]);
  return (
    <>
      <PageHeader kicker="Admin" title="Activity">
        <p className="muted">Who changed what, newest first (the last 500 changes).</p>
      </PageHeader>
      <ErrorNote error={q.error} onRetry={q.reload} />
      {q.loading && !q.data && <Skeleton />}
      {q.data && !q.data.items.length && <EmptyState title="Nothing yet">Changes made in the admin show up here.</EmptyState>}
      {q.data?.items.length > 0 && (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>What</th>
              </tr>
            </thead>
            <tbody>
              {q.data.items.map((a) => (
                <tr key={a.id}>
                  <td className="mono dim" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                    {formatDateTime(a.createdAt)}
                  </td>
                  <td>{a.actorName || "System"}</td>
                  <td>{a.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {q.data && <Pager page={page} pageSize={50} total={q.data.total} onPage={(n) => setParams({ page: String(n) })} />}
    </>
  );
}
