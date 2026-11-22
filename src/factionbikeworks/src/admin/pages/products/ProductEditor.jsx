import { useEffect, useReducer, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { adminApi } from "../../lib/adminApi";
import { useAdminQuery } from "../../lib/hooks";
import { DirtyPrompt, useDirtyGuard } from "../../lib/useDirtyGuard";
import { Button, Combobox, Field, NumberInput, Select, TextArea, TextInput, Toggle } from "../../ui/controls";
import { ConfirmDialog } from "../../ui/overlay";
import { BackLink, ErrorNote, PageHeader, Panel, Pill, SaveBar, Skeleton } from "../../ui/layout";
import { StockAdjust } from "../stock/StockAdjust";
import { StockHistoryDrawer } from "../stock/StockHistoryDrawer";
import { editorReducer, emptyProduct, fromProduct, isDirty, toPayload, variantErrors } from "./editorState";
import { VariantsTable } from "./VariantsTable";
import { PhotoStrips } from "./PhotoStrips";
import { SpecsEditor } from "./SpecsEditor";
import { ProductPreview } from "./ProductPreview";
import { useToast } from "../../../lib/store";

const CONFLICT = "Someone else saved this product since you opened it. Reload to see their changes.";

export default function ProductEditorRoute() {
  const { id } = useParams();
  return <ProductEditor key={id || "new"} id={id === "new" || !id ? null : Number(id)} />;
}

function ProductEditor({ id }) {
  const toast = useToast();
  const navigate = useNavigate();
  const loaded = useAdminQuery(() => (id ? adminApi.get(`/products/${id}`) : Promise.resolve(null)), [id]);
  const tax = useAdminQuery(() => adminApi.get("/taxonomy"), []);
  const [initial, setInitial] = useState(() => (id ? null : emptyProduct()));
  const [state, dispatch] = useReducer(editorReducer, initial);
  const [errors, setErrors] = useState({});
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adjust, setAdjust] = useState(null);
  const [history, setHistory] = useState(null);
  const [confirm, setConfirm] = useState(null); // "delete" | "archive"
  const [goTo, setGoTo] = useState(null);

  // Each fresh load (first open, or Reload after a conflict) replaces both copies.
  const [seen, setSeen] = useState(null);
  if (loaded.data && loaded.data !== seen) {
    const s = fromProduct(loaded.data);
    setSeen(loaded.data);
    setInitial(s);
    dispatch({ type: "reset", state: s });
  }

  const dirty = !!(initial && state && isDirty(initial, state));
  const blocker = useDirtyGuard(dirty && !goTo);

  useEffect(() => {
    if (goTo) navigate(goTo, { replace: true });
  }, [goTo, navigate]);

  if (loaded.error) return <ErrorNote error={loaded.error} onRetry={loaded.reload} />;
  if (!state) return <Skeleton rows={8} />;

  const set = (field) => (value) => dispatch({ type: "set", field, value });
  const vErr = variantErrors(errors, state);

  const save = async () => {
    setSaving(true);
    setErrors({});
    setConflict(false);
    try {
      const payload = toPayload(state);
      const saved = id ? await adminApi.put(`/products/${id}`, payload) : await adminApi.post("/products", payload);
      const s = fromProduct(saved);
      setInitial(s);
      dispatch({ type: "reset", state: s });
      toast(id ? "Product saved" : "Product created");
      if (!id) setGoTo(`/admin/products/${saved.id}`);
    } catch (e) {
      if (e.code === "version_conflict") setConflict(true);
      else if (e.errors) {
        setErrors(e.errors);
        toast("Please fix the highlighted fields.", "error");
      } else toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const reload = () => {
    setConflict(false);
    setErrors({});
    loaded.reload();
  };

  const duplicate = async () => {
    try {
      const r = await adminApi.post(`/products/${id}/duplicate`);
      toast("Draft copy created");
      navigate(`/admin/products/${r.id}`);
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const destroy = async () => {
    try {
      if (confirm === "delete") {
        await adminApi.del(`/products/${id}`);
        toast("Product deleted");
        setGoTo("/admin/products");
      } else {
        const saved = await adminApi.put(`/products/${id}`, { ...toPayload(initial), status: "archived" });
        const s = fromProduct(saved);
        setInitial(s);
        dispatch({ type: "reset", state: s });
        toast("Product archived. It's hidden from the shop and kept for order history.");
      }
    } catch (e) {
      toast(e.code === "version_conflict" ? CONFLICT : e.message, "error");
    } finally {
      setConfirm(null);
    }
  };

  const updateStock = (variationId, stock) => {
    const patch = (s) => ({ ...s, variations: s.variations.map((v) => (v.id === variationId ? { ...v, stock } : v)) });
    setInitial(patch);
    dispatch({ type: "reset", state: patch(state) });
  };
  const setMedia = (variationId, media) => {
    setInitial((s) => ({ ...s, variations: s.variations.map((v) => (v.id === variationId ? { ...v, media } : v)) }));
    dispatch({ type: "setMedia", variationId, media });
  };

  const categories = (tax.data?.categories || []).map((c) => c.name);
  const brands = (tax.data?.brands || []).map((b) => b.name);

  return (
    <>
      <BackLink to="/admin/products">Products</BackLink>
      <PageHeader
        title={id ? initial?.name || "Product" : "New product"}
        actions={
          id && (
            <>
              <Pill tone={initial.status}>{initial.status === "live" ? "Live" : initial.status === "draft" ? "Draft" : "Archived"}</Pill>
              {initial.status === "live" && (
                <Link className="btn btn-ghost btn-sm adm-btn" to={`/viewProduct/${id}`} target="_blank">
                  View on site
                </Link>
              )}
            </>
          )
        }
      />
      {conflict && (
        <div className="adm-banner" role="alert">
          <span>{CONFLICT}</span>
          <Button size="sm" onClick={reload}>
            Reload
          </Button>
        </div>
      )}

      <div className="adm-grid-2">
        <div className="adm-stack">
          <Panel title="Basics">
            <div className="adm-stack">
              <Field label="Name" error={errors.name}>
                <TextInput value={state.name} onChange={set("name")} maxLength={100} />
              </Field>
              <div className="adm-cols">
                <Field label="Brand" error={errors.brand}>
                  <Combobox value={state.brand} onChange={set("brand")} options={brands} placeholder="Start typing" />
                </Field>
                <Field label="Category" error={errors.category}>
                  <Combobox value={state.category} onChange={set("category")} options={categories} placeholder="Start typing" />
                </Field>
              </div>
              <Field label="Description" hint="Line breaks are kept on the product page." error={errors.description}>
                <TextArea value={state.description} onChange={set("description")} rows={5} maxLength={5000} />
              </Field>
            </div>
          </Panel>

          <Panel title="Variants" description="Each variant has its own SKU, price, stock and photos." flush>
            <div style={{ padding: "0 18px 18px" }}>
              {errors.variations && <p className="adm-error">{errors.variations}</p>}
              <VariantsTable variations={state.variations} errors={vErr} dispatch={dispatch} onAdjust={(v, anchor) => setAdjust({ v, anchor })} onHistory={setHistory} />
            </div>
          </Panel>

          <Panel title="Photos">
            <PhotoStrips variations={state.variations} onMedia={setMedia} />
          </Panel>

          <Panel title="Specs">
            <SpecsEditor specs={state.specs} onChange={set("specs")} errors={errors} />
          </Panel>

          <Panel title="Visibility">
            <div className="adm-cols">
              <Field label="Status" hint={state.status === "draft" ? "Only admins can see drafts." : state.status === "archived" ? "Hidden from the shop, kept for order history." : "On the shop now."}>
                <Select value={state.status} onChange={set("status")} options={[["draft", "Draft"], ["live", "Live"], ["archived", "Archived"]]} />
              </Field>
              <Field label="Low-stock alert at" hint="“Only N left” shows at or under this." error={errors.lowStockThreshold}>
                <NumberInput min={0} max={1000} value={state.lowStockThreshold} onChange={set("lowStockThreshold")} />
              </Field>
              <Field label="Featured">
                <Toggle checked={state.featured} onChange={set("featured")} label="Lead “Fresh off the truck”" />
              </Field>
            </div>
          </Panel>
        </div>

        <aside aria-label="Preview">
          <ProductPreview state={state} />
        </aside>
      </div>

      <SaveBar dirty={dirty || !id} saving={saving} onSave={save} onDiscard={() => dispatch({ type: "reset", state: initial })} saveLabel={id ? "Save" : "Create product"}>
        {id && (
          <>
            <Button size="sm" variant="quiet" onClick={duplicate} disabled={dirty}>
              Duplicate
            </Button>
            {initial.ordered ? (
              initial.status !== "archived" && (
                <Button size="sm" variant="quiet" onClick={() => setConfirm("archive")} disabled={dirty}>
                  Archive
                </Button>
              )
            ) : (
              <Button size="sm" variant="quiet" onClick={() => setConfirm("delete")}>
                Delete
              </Button>
            )}
          </>
        )}
      </SaveBar>

      {adjust && <StockAdjust anchor={adjust.anchor} variation={adjust.v} onClose={() => setAdjust(null)} onDone={(stock) => updateStock(adjust.v.id, stock)} />}
      {history && <StockHistoryDrawer variation={history} onClose={() => setHistory(null)} />}
      {confirm && (
        <ConfirmDialog
          title={confirm === "delete" ? `Delete ${initial.name}?` : `Archive ${initial.name}?`}
          confirmLabel={confirm === "delete" ? "Delete" : "Archive"}
          tone="danger"
          onCancel={() => setConfirm(null)}
          onConfirm={destroy}
        >
          {confirm === "delete" ? "It has never been ordered, so it can be removed completely, with its photos. This can't be undone." : "It has orders, so it can't be deleted. Archiving hides it from the shop and keeps it for order history."}
        </ConfirmDialog>
      )}
      <DirtyPrompt blocker={blocker} />
    </>
  );
}
