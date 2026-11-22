import { useParams } from "react-router";
import { GROUPS, mergeSite } from "../../../../../shared/site-schema.js";
import { CONTENT_PAGES } from "../../nav";
import { useGroups } from "../../forms/useGroup";
import { SchemaForm } from "../../forms/SchemaForm";
import { DirtyPrompt, useDirtyGuard } from "../../lib/useDirtyGuard";
import { Button, Toggle } from "../../ui/controls";
import { ErrorNote, PageHeader, Panel, SaveBar, Skeleton } from "../../ui/layout";
import { SubNav } from "../settings/SettingsPage";
import { CONTENT_GROUPS } from "./contentPages";
import { GroupPreview } from "./Previews";
import { useHomeData } from "../../../pages/Home";
import { useSite } from "../../../lib/site";

export default function ContentPage() {
  const { page = "home" } = useParams();
  const key = CONTENT_GROUPS[page] ? page : "home";
  return <ContentEditor key={key} page={key} />;
}

function ContentEditor({ page }) {
  const keys = CONTENT_GROUPS[page];
  const g = useGroups(keys);
  const live = useSite();
  const data = useHomeData();
  const blocker = useDirtyGuard(g.dirty);
  const label = CONTENT_PAGES.find((p) => p.key === page)?.label;
  const ready = keys.every((k) => g.drafts[k]);
  // Previews use the live site with this page's drafts on top.
  const site = ready ? mergeSite({ ...live, ...g.drafts }) : null;

  return (
    <>
      <PageHeader kicker="Site content" title={label}>
        <p className="muted">Changes go live as soon as you save. Headings accept ~outline~, ==highlight== and ^accent^.</p>
      </PageHeader>
      <SubNav pages={CONTENT_PAGES} base="/admin/content" />
      {g.conflict && (
        <div className="adm-banner" role="alert">
          {g.conflict}
          <Button size="sm" onClick={g.reload}>
            Reload
          </Button>
        </div>
      )}
      <ErrorNote error={g.error} onRetry={g.reload} />
      {!ready ? (
        <Skeleton rows={8} />
      ) : (
        <div className="adm-stack" style={{ gap: 20 }}>
          {keys.map((k) => {
            const def = GROUPS[k];
            const value = g.drafts[k];
            const hasVisible = "visible" in def.fields;
            return (
              <Panel
                key={k}
                title={def.label}
                actions={
                  <>
                    {hasVisible && <Toggle checked={value.visible} onChange={(v) => g.setDraft(k, { ...value, visible: v })} label="Show this section" />}
                    <Button size="sm" variant="quiet" onClick={() => g.resetToDefaults(k)}>
                      Reset
                    </Button>
                  </>
                }
              >
                <div className="adm-grid-2" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
                  <SchemaForm fields={def.fields} value={value} onChange={(v) => g.setDraft(k, v)} errors={g.errors[k]} skip={["visible"]} />
                  <div style={{ position: "sticky", top: 80 }}>
                    <GroupPreview groupKey={k} site={site} data={data} />
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
      <SaveBar dirty={g.dirty} saving={g.saving} onSave={g.save} onDiscard={g.discard} />
      <DirtyPrompt blocker={blocker} />
    </>
  );
}
