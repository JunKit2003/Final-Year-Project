// Product editor state: pure functions, unit-tested. The screen keeps the saved product
// (`initial`) and the working copy; "dirty" means the payload would differ.
let seq = 0;
const key = () => `v${++seq}`;

const variant = (v = {}) => ({
  key: key(),
  id: v.id ?? null,
  name: v.name ?? "",
  sku: v.sku ?? "",
  price: v.price ?? "",
  compareAtPrice: v.compareAtPrice ?? "",
  stock: v.stock ?? 0,
  intendedUse: v.intendedUse ?? "",
  ordered: !!v.ordered,
  media: v.media || [],
  version: v.version ?? 1,
});

export const emptyProduct = () => ({
  id: null,
  version: null,
  name: "",
  brand: "",
  category: "",
  description: "",
  status: "draft",
  featured: false,
  specs: [],
  lowStockThreshold: 3,
  ordered: false,
  variations: [variant()],
});

export const fromProduct = (p) => ({
  id: p.id,
  version: p.version,
  name: p.name,
  brand: p.brand,
  category: p.category,
  description: p.description || "",
  status: p.status,
  featured: !!p.featured,
  specs: (p.specs || []).map((s) => ({ ...s })),
  lowStockThreshold: p.lowStockThreshold ?? 3,
  ordered: !!p.ordered,
  variations: (p.variations || []).map(variant),
});

const move = (list, from, to) => {
  const out = [...list];
  const [item] = out.splice(from, 1);
  out.splice(Math.max(0, Math.min(to, out.length)), 0, item);
  return out;
};

export function editorReducer(state, action) {
  switch (action.type) {
    case "reset":
      return action.state;
    case "set":
      return { ...state, [action.field]: action.value };
    case "setVariant":
      return { ...state, variations: state.variations.map((v, i) => (i === action.index ? { ...v, [action.field]: action.value } : v)) };
    case "addVariant":
      return { ...state, variations: [...state.variations, variant()] };
    case "duplicateVariant": {
      const src = state.variations[action.index];
      const copy = variant({ ...src, id: null, ordered: false, media: [], stock: 0, sku: src.sku ? `${src.sku}-COPY` : "" });
      const list = [...state.variations];
      list.splice(action.index + 1, 0, copy);
      return { ...state, variations: list };
    }
    case "removeVariant":
      return { ...state, variations: state.variations.filter((_, i) => i !== action.index) };
    case "moveVariant":
      return { ...state, variations: move(state.variations, action.from, action.to) };
    case "setMedia":
      return { ...state, variations: state.variations.map((v) => (v.id === action.variationId ? { ...v, media: action.media } : v)) };
    default:
      return state;
  }
}

const num = (v) => (v === "" || v === null || v === undefined ? null : Number(v));

export function toPayload(s) {
  return {
    ...(s.version != null ? { version: s.version } : {}),
    name: s.name.trim(),
    brand: s.brand.trim(),
    category: s.category.trim(),
    description: s.description,
    status: s.status,
    featured: s.featured,
    lowStockThreshold: num(s.lowStockThreshold) ?? 0,
    specs: s.specs.filter((x) => x.label.trim() || x.value.trim()).map((x) => ({ label: x.label.trim(), value: x.value.trim() })),
    variations: s.variations.map((v, i) => ({
      ...(v.id ? { id: v.id, version: v.version } : { stock: num(v.stock) ?? 0 }),
      name: v.name.trim(),
      sku: v.sku.trim(),
      price: num(v.price),
      compareAtPrice: num(v.compareAtPrice),
      intendedUse: v.intendedUse.trim(),
      position: i,
    })),
  };
}

export const isDirty = (initial, current) => JSON.stringify(toPayload(initial)) !== JSON.stringify(toPayload(current));

/** Field errors from the API ("variations.1.sku") by variant key, for the table. */
export function variantErrors(errors, state) {
  const out = {};
  for (const [path, msg] of Object.entries(errors || {})) {
    const m = path.match(/^variations\.(\d+)\.(\w+)$/);
    if (!m) continue;
    const v = state.variations[Number(m[1])];
    if (v) (out[v.key] ||= {})[m[2]] = msg;
  }
  return out;
}
