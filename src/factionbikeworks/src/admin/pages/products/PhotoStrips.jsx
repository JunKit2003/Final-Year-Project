import { useState } from "react";
import { adminApi } from "../../lib/adminApi";
import { ImageDrop } from "../../ui/ImageDrop";
import { Select } from "../../ui/controls";
import { assetUrl } from "../../../lib/api";
import { useToast } from "../../../lib/store";

/**
 * One strip of photos per saved variant. Changes save immediately (they're files, not form
 * fields). Drag to reorder within a strip or move to another variant; the first is the cover.
 */
export function PhotoStrips({ variations, onMedia }) {
  const toast = useToast();
  const [drag, setDrag] = useState(null); // { id, from }
  const [busy, setBusy] = useState(null);

  const saved = variations.filter((v) => v.id);
  const order = async (lists) => {
    // lists: { [variationId]: media[] }
    const items = Object.entries(lists).flatMap(([vid, list]) => list.map((m, i) => ({ id: m.id, position: i, variationId: Number(vid) })));
    try {
      await adminApi.patch("/media/order", { items });
      for (const [vid, list] of Object.entries(lists)) onMedia(Number(vid), list.map((m, i) => ({ ...m, variationId: Number(vid), position: i })));
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const drop = (target, index) => {
    if (!drag) return;
    const from = saved.find((v) => v.id === drag.from);
    const to = saved.find((v) => v.id === target);
    const moving = from.media.find((m) => m.id === drag.id);
    const fromList = from.media.filter((m) => m.id !== drag.id);
    const toList = (from.id === to.id ? fromList : [...to.media]).slice();
    toList.splice(index ?? toList.length, 0, moving);
    order(from.id === to.id ? { [to.id]: toList } : { [from.id]: fromList, [to.id]: toList });
    setDrag(null);
  };

  const upload = async (v, files) => {
    setBusy(v.id);
    let list = v.media;
    for (const f of files) {
      try {
        const m = await adminApi.upload(`/variations/${v.id}/media`, f);
        list = [...list, m];
        onMedia(v.id, list);
      } catch (e) {
        toast(`${f.name}: ${e.message}`, "error");
      }
    }
    setBusy(null);
  };

  const remove = async (v, m) => {
    try {
      await adminApi.del(`/media/${m.id}`);
      onMedia(v.id, v.media.filter((x) => x.id !== m.id));
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const copyFrom = async (v, fromId) => {
    try {
      const added = await adminApi.post(`/variations/${v.id}/media/copy-from/${fromId}`);
      onMedia(v.id, [...v.media, ...added]);
      toast(`Copied ${added.length} photo${added.length === 1 ? "" : "s"}`);
    } catch (e) {
      toast(e.message, "error");
    }
  };

  return (
    <div className="adm-stack">
      {variations.map((v) => (
        <div key={v.key} className="adm-list-item">
          <div className="adm-list-item-head">
            <strong style={{ color: "var(--text)" }}>{v.name || "New variant"}</strong>
            {v.id && saved.length > 1 && (
              <Select
                value=""
                onChange={(fromId) => fromId && copyFrom(v, fromId)}
                options={[["", "Copy photos from…"], ...saved.filter((o) => o.id !== v.id && o.media.length).map((o) => [String(o.id), `${o.name} (${o.media.length})`])]}
                aria-label={`Copy photos to ${v.name}`}
                style={{ width: "auto", minHeight: 32 }}
              />
            )}
          </div>
          {!v.id ? (
            <p className="adm-hint">Save the product to add photos to this variant.</p>
          ) : (
            <div className="adm-photos" onDragOver={(e) => drag && e.preventDefault()} onDrop={(e) => (e.preventDefault(), drop(v.id))}>
              {v.media.map((m, i) => (
                <div
                  key={m.id}
                  className={`adm-photo ${i === 0 ? "is-cover" : ""} ${drag?.id === m.id ? "is-dragging" : ""}`}
                  draggable
                  onDragStart={() => setDrag({ id: m.id, from: v.id })}
                  onDragEnd={() => setDrag(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    drop(v.id, i);
                  }}
                >
                  <img src={assetUrl(m.url)} alt={m.alt || `${v.name} photo ${i + 1}`} />
                  {i === 0 && <span className="adm-photo-tag">Cover</span>}
                  <button type="button" aria-label={`Remove photo ${i + 1} of ${v.name}`} onClick={() => remove(v, m)}>
                    ×
                  </button>
                </div>
              ))}
              <ImageDrop compact label={busy === v.id ? "Uploading…" : "Add photos"} disabled={busy === v.id} onFiles={(files) => upload(v, files)} onError={(msg) => toast(msg, "error")} />
            </div>
          )}
        </div>
      ))}
      <p className="adm-hint">Drop photos or click to upload. Drag to reorder, or onto another variant to move it. The first photo is the cover.</p>
    </div>
  );
}
