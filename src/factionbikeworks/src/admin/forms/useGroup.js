import { useCallback, useState } from "react";
import { adminApi } from "../lib/adminApi";
import { useAdminQuery } from "../lib/hooks";
import { useSiteReload } from "../../lib/site";
import { useToast } from "../../lib/store";

/**
 * Load and save several settings groups together (a page may show many sections).
 * Each group keeps its own version; only changed groups are saved.
 */
export function useGroups(keys) {
  const toast = useToast();
  const reloadSite = useSiteReload();
  const id = keys.join(",");
  const q = useAdminQuery(async () => Object.fromEntries(await Promise.all(keys.map(async (k) => [k, await adminApi.get(`/settings/${k}`)]))), [id]);
  const [drafts, setDrafts] = useState({});
  const [seen, setSeen] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(null);

  if (q.data && q.data !== seen) {
    setSeen(q.data);
    setDrafts(Object.fromEntries(Object.entries(q.data).map(([k, g]) => [k, g.value])));
  }

  const changed = q.data ? keys.filter((k) => JSON.stringify(drafts[k]) !== JSON.stringify(q.data[k]?.value)) : [];
  const setDraft = useCallback((k, v) => setDrafts((d) => ({ ...d, [k]: v })), []);

  const save = async () => {
    setSaving(true);
    setErrors({});
    setConflict(null);
    const next = { ...q.data };
    let failed = false;
    let conflictMsg = null;
    for (const k of changed) {
      try {
        const r = await adminApi.put(`/settings/${k}`, { value: drafts[k], version: q.data[k].version });
        next[k] = { ...q.data[k], value: r.value, version: r.version };
      } catch (e) {
        failed = true;
        if (e.code === "version_conflict") conflictMsg = e.message;
        else if (e.errors) setErrors((all) => ({ ...all, [k]: e.errors }));
        else toast(e.message, "error");
      }
    }
    q.setData(next);
    setSeen(next);
    setDrafts((d) => ({ ...d, ...Object.fromEntries(changed.filter((k) => next[k] !== q.data[k]).map((k) => [k, next[k].value])) }));
    setSaving(false);
    setConflict(conflictMsg);
    if (!failed) {
      toast("Saved. Live on the site now.");
      reloadSite();
    } else if (!conflictMsg) toast("Some changes weren't saved. Check the highlighted fields.", "error");
  };

  const discard = () => setDrafts(Object.fromEntries(Object.entries(q.data || {}).map(([k, g]) => [k, g.value])));
  const resetToDefaults = (k) => setDraft(k, q.data[k].defaults);

  return { groups: q.data, loading: q.loading, error: q.error, reload: q.reload, drafts, setDraft, dirty: changed.length > 0, changed, save, saving, errors, conflict, discard, resetToDefaults };
}
