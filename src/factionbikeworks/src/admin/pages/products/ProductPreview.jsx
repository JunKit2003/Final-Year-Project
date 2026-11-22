import ProductCard from "../../../components/ProductCard";
import { formatRM, stockState, wasPrice } from "../../../lib/shop";

/** Turn editor state into the shape the storefront components expect. */
export const previewProduct = (s) => ({
  id: s.id || 0,
  name: s.name || "Product name",
  brand: s.brand || "Brand",
  category: s.category,
  featured: s.featured,
  lowStockThreshold: Number(s.lowStockThreshold) || 0,
  variations: s.variations.map((v) => ({
    id: v.id,
    name: v.name,
    price: Number(v.price) || 0,
    compareAtPrice: v.compareAtPrice === "" ? null : Number(v.compareAtPrice),
    stock: Number(v.stock) || 0,
    images: { files: v.media.map((m) => m.url) },
  })),
});

export function ProductPreview({ state }) {
  const p = previewProduct(state);
  const v = p.variations[0] || {};
  const st = stockState(v.stock, p.lowStockThreshold);
  const was = wasPrice(v);
  return (
    <>
      <div className="adm-preview">
        <div className="adm-preview-label">
          <span>Card preview</span>
          <span>{state.status === "live" ? "Live" : state.status === "draft" ? "Draft" : "Archived"}</span>
        </div>
        <div className="adm-preview-stage" style={{ padding: 16 }}>
          <ProductCard product={p} tilt={false} />
        </div>
      </div>
      <div className="adm-preview">
        <div className="adm-preview-label">
          <span>Product page</span>
        </div>
        <div className="adm-preview-stage" style={{ padding: 16 }}>
          <p className="kicker">{p.brand}</p>
          <h2 className="pdp-title">
            {p.name}
          </h2>
          <div className="pdp-price-row" style={{ marginTop: 10 }}>
            <span className="pdp-price">{formatRM(v.price)}</span>
            {was && <s className="price-was">{formatRM(was)}</s>}
            <span className={`tag tag--${st.key}`}>
              <i /> {st.label}
            </span>
          </div>
          {state.specs.some((s) => s.label) && (
            <dl className="specs" style={{ marginTop: 12 }}>
              {state.specs
                .filter((s) => s.label)
                .map((s, i) => (
                  <div key={i}>
                    <dt className="mono">{s.label}</dt>
                    <dd>{s.value}</dd>
                  </div>
                ))}
            </dl>
          )}
          {state.description && (
            <p className="muted" style={{ whiteSpace: "pre-line", marginTop: 12 }}>
              {state.description}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
