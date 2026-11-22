import { NavLink, useParams } from "react-router";
import { GROUPS } from "../../../../../shared/site-schema.js";
import { SETTINGS_PAGES } from "../../nav";
import { useGroups } from "../../forms/useGroup";
import { SchemaForm } from "../../forms/SchemaForm";
import { DirtyPrompt, useDirtyGuard } from "../../lib/useDirtyGuard";
import { Button } from "../../ui/controls";
import { ErrorNote, PageHeader, Panel, SaveBar, Skeleton } from "../../ui/layout";
import { ThemePreview } from "./ThemePreview";

export function SubNav({ pages, base }) {
  return (
    <nav className="adm-subnav adm-chips" aria-label="Sections">
      {pages.map((p) => (
        <NavLink key={p.key} to={`${base}/${p.key}`} className={({ isActive }) => `adm-chip ${isActive ? "is-on" : ""}`} style={{ display: "inline-flex", alignItems: "center" }}>
          {p.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function SettingsPage() {
  const { group = "shop" } = useParams();
  const key = GROUPS[group] && !group.startsWith("content.") ? group : "shop";
  return <GroupEditor key={key} groupKey={key} />;
}

function GroupEditor({ groupKey }) {
  const g = useGroups([groupKey]);
  const blocker = useDirtyGuard(g.dirty);
  const value = g.drafts[groupKey];
  const def = GROUPS[groupKey];
  return (
    <>
      <PageHeader kicker="Shop settings" title={def.label} />
      <SubNav pages={SETTINGS_PAGES} base="/admin/settings" />
      {g.conflict && (
        <div className="adm-banner" role="alert">
          {g.conflict}
          <Button size="sm" onClick={g.reload}>
            Reload
          </Button>
        </div>
      )}
      <ErrorNote error={g.error} onRetry={g.reload} />
      {!value ? (
        <Skeleton rows={6} />
      ) : (
        <div className={groupKey === "theme" ? "adm-grid-2" : undefined}>
          <Panel
            actions={
              <Button size="sm" variant="quiet" onClick={() => g.resetToDefaults(groupKey)}>
                Reset to defaults
              </Button>
            }
          >
            <SchemaForm fields={def.fields} value={value} onChange={(v) => g.setDraft(groupKey, v)} errors={g.errors[groupKey]} />
          </Panel>
          {groupKey === "theme" && (
            <aside>
              <ThemePreview theme={value} />
            </aside>
          )}
        </div>
      )}
      <SaveBar dirty={g.dirty} saving={g.saving} onSave={g.save} onDiscard={g.discard} />
      <DirtyPrompt blocker={blocker} />
    </>
  );
}
