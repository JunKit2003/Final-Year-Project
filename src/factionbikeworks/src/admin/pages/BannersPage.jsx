import { useState } from "react";
import { adminApi } from "../lib/adminApi";
import { useAdminQuery } from "../lib/hooks";
import { useDragOrder } from "../lib/useDragOrder";
import { Button, Field, TextInput, Toggle } from "../ui/controls";
import { ImageDrop } from "../ui/ImageDrop";
import { ConfirmDialog } from "../ui/overlay";
import { EmptyState, ErrorNote, PageHeader, Panel, Skeleton } from "../ui/layout";
import { assetUrl } from "../../lib/api";
import { useToast } from "../../lib/store";

export default function BannersPage() {
  const toast = useToast();
  const q = useAdminQuery(() => adminApi.get("/banners"), []);
  const [uploading, setUploading] = useState(false);
  const [remove, setRemove] = useState(null);
  const items = q.data?.items || [];
  const reorder = async (next) => {
    q.setData({ items: next });
    try {
      q.setData(await adminApi.patch("/banners/order", { ids: next.map((b) => b.id) }));
    } catch (e) {
      toast(e.message, "error");
      q.reload();
    }
  };
  const { itemProps, move } = useDragOrder(items, reorder);

  const upload = async (files) => {
    setUploading(true);
    for (const f of files) {
      try {
        await adminApi.upload("/banners", f);
      } catch (e) {
        toast(`${f.name}: ${e.message}`, "error");
      }
    }
    setUploading(false);
    q.reload();
  };

  return (
    <>
      <PageHeader kicker="Home page" title="Banners">
        <p className="muted">Photos that crossfade behind the home page headline, in this order. The first one also shows on the About and sign-in pages unless they have their own photo.</p>
      </PageHeader>
      <Panel>
        <ImageDrop onFiles={upload} label={uploading ? "Uploading…" : "Drop banner photos or click to upload (wide photos work best)"} disabled={uploading} onError={(m) => toast(m, "error")} />
      </Panel>
      <ErrorNote error={q.error} onRetry={q.reload} />
      {q.loading && !q.data && <Skeleton />}
      {q.data && !items.length && <EmptyState title="No banners yet">The home page shows a plain background until you add one.</EmptyState>}
      <div className="adm-stack" style={{ marginTop: 16 }}>
        {items.map((b, i) => (
          <BannerRow key={b.id} banner={b} index={i} count={items.length} dragProps={itemProps(i)} onMove={(d) => move(i, d)} onSaved={q.reload} onRemove={() => setRemove(b)} />
        ))}
      </div>
      {remove && (
        <ConfirmDialog
          title="Delete this banner?"
          confirmLabel="Delete"
          tone="danger"
          onCancel={() => setRemove(null)}
          onConfirm={async () => {
            try {
              await adminApi.del(`/banners/${remove.id}`);
              toast("Banner deleted");
              q.reload();
            } catch (e) {
              toast(e.message, "error");
            }
            setRemove(null);
          }}
        >
          The photo is removed from the site. This can&apos;t be undone.
        </ConfirmDialog>
      )}
    </>
  );
}

function BannerRow({ banner, index, count, dragProps, onMove, onSaved, onRemove }) {
  const toast = useToast();
  const [alt, setAlt] = useState(banner.alt);
  const [linkUrl, setLink] = useState(banner.linkUrl);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const save = async (patch = {}) => {
    setSaving(true);
    setErrors({});
    try {
      await adminApi.put(`/banners/${banner.id}`, { alt, linkUrl, isActive: banner.isActive, ...patch });
      toast("Banner saved");
      onSaved();
    } catch (e) {
      if (e.errors) setErrors(e.errors);
      else toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };
  const dirty = alt !== banner.alt || linkUrl !== banner.linkUrl;
  return (
    <div className="adm-list-item" {...dragProps} style={{ gridTemplateColumns: "auto 220px 1fr auto", display: "grid", alignItems: "center", opacity: banner.isActive ? 1 : 0.6 }}>
      <span className="handle" style={{ cursor: "grab" }} aria-hidden>
        ⋮⋮
      </span>
      <img src={assetUrl(banner.imageUrl)} alt="" style={{ width: 220, height: 110, objectFit: "cover", borderRadius: 8 }} />
      <div className="adm-cols">
        <Field label="Alt text (describes the photo)" error={errors.alt}>
          <TextInput value={alt} onChange={setAlt} maxLength={200} placeholder="Riders outside the shop" />
        </Field>
        <Field label="Link (optional)" error={errors.linkUrl} hint="/catalog/Deity or https://…">
          <TextInput value={linkUrl} onChange={setLink} />
        </Field>
        <div className="adm-actions">
          <Toggle checked={banner.isActive} onChange={(v) => save({ isActive: v })} label={banner.isActive ? "Showing" : "Hidden"} />
          {dirty && (
            <Button size="sm" variant="primary" loading={saving} onClick={() => save()}>
              Save
            </Button>
          )}
        </div>
      </div>
      <div className="adm-actions" style={{ flexDirection: "column" }}>
        <button type="button" className="icon-btn adm-icon-sm" aria-label="Move up" disabled={index === 0} onClick={() => onMove(-1)}>
          ↑
        </button>
        <button type="button" className="icon-btn adm-icon-sm" aria-label="Move down" disabled={index === count - 1} onClick={() => onMove(1)}>
          ↓
        </button>
        <button type="button" className="icon-btn adm-icon-sm" aria-label="Delete banner" onClick={onRemove}>
          ×
        </button>
      </div>
    </div>
  );
}
