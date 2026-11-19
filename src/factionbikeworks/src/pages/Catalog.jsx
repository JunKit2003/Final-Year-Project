import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { useProducts } from "../lib/store";
import { SORTS, countBy, filterProducts } from "../lib/shop";
import ProductCard, { ProductCardSkeleton } from "../components/ProductCard";
import { Empty, PageHead } from "../components/ui/Bits";
import { Close, Search, Sliders } from "../components/ui/Icons";

const PAGE = 12;

export default function Catalog() {
  const { brandname } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { products, loading, error, retry } = useProducts();
  const [drawer, setDrawer] = useState(false);
  const [page, setPage] = useState({ sig: "", n: PAGE });

  // Filters live in the URL so a filtered view can be shared or bookmarked.
  const f = {
    q: params.get("q") || "",
    category: params.get("category") || "",
    brand: brandname ? decodeURIComponent(brandname) : "",
    min: params.get("min") || "",
    max: params.get("max") || "",
    inStock: params.get("stock") === "1",
    sort: params.get("sort") || "featured",
  };

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value === "" || value == null || value === false) next.delete(key);
    else next.set(key, value === true ? "1" : value);
    setParams(next, { replace: true });
  };

  const setBrand = (b) => navigate({ pathname: b ? `/catalog/${encodeURIComponent(b)}` : "/catalog", search: params.toString() });

  const clearAll = () => navigate("/catalog");

  const results = useMemo(() => filterProducts(products, f), [products, f.q, f.category, f.brand, f.min, f.max, f.inStock, f.sort]); // eslint-disable-line react-hooks/exhaustive-deps
  const categories = useMemo(() => countBy(products, "category"), [products]);
  const brands = useMemo(() => countBy(products, "brand"), [products]);

  // "Load more" count resets whenever the filters change (derived, no effect needed).
  const sig = [f.q, f.category, f.brand, f.min, f.max, f.inStock, f.sort].join("|");
  const shown = page.sig === sig ? page.n : PAGE;
  const setShown = (fn) => setPage({ sig, n: fn(shown) });

  useEffect(() => {
    if (!drawer) return undefined;
    const onKey = (e) => e.key === "Escape" && setDrawer(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawer]);

  const chips = [
    f.q && { k: "q", label: `“${f.q}”`, clear: () => setParam("q", "") },
    f.brand && { k: "brand", label: f.brand, clear: () => setBrand("") },
    f.category && { k: "category", label: f.category, clear: () => setParam("category", "") },
    f.min && { k: "min", label: `From RM${f.min}`, clear: () => setParam("min", "") },
    f.max && { k: "max", label: `Up to RM${f.max}`, clear: () => setParam("max", "") },
    f.inStock && { k: "stock", label: "In stock", clear: () => setParam("stock", "") },
  ].filter(Boolean);

  const facets = (pfx) => (
    <>
      <div className="facet">
        <p className="facet-label mono">Category</p>
        <button type="button" className={`facet-opt ${!f.category ? "is-on" : ""}`} onClick={() => setParam("category", "")}>
          All parts <span>{products.length}</span>
        </button>
        {categories.map((c) => (
          <button type="button" key={c.name} className={`facet-opt ${f.category === c.name ? "is-on" : ""}`} onClick={() => setParam("category", f.category === c.name ? "" : c.name)}>
            {c.name} <span>{c.count}</span>
          </button>
        ))}
      </div>
      <div className="facet">
        <p className="facet-label mono">Brand</p>
        <div className="facet-pills">
          {brands.map((b) => (
            <button type="button" key={b.name} className={`pill ${f.brand.toLowerCase() === b.name.toLowerCase() ? "is-on" : ""}`} onClick={() => setBrand(f.brand.toLowerCase() === b.name.toLowerCase() ? "" : b.name)}>
              {b.name}
            </button>
          ))}
        </div>
      </div>
      <div className="facet">
        <p className="facet-label mono">Price (RM)</p>
        <div className="facet-row">
          <div className="field">
            <input id={`${pfx}-min`} type="number" min="0" inputMode="numeric" value={f.min} onChange={(e) => setParam("min", e.target.value)} placeholder=" " />
            <label htmlFor={`${pfx}-min`}>Min</label>
          </div>
          <div className="field">
            <input id={`${pfx}-max`} type="number" min="0" inputMode="numeric" value={f.max} onChange={(e) => setParam("max", e.target.value)} placeholder=" " />
            <label htmlFor={`${pfx}-max`}>Max</label>
          </div>
        </div>
      </div>
      <label className="switch">
        <input type="checkbox" checked={f.inStock} onChange={(e) => setParam("stock", e.target.checked)} />
        <span className="switch-track">
          <span />
        </span>
        In stock only
      </label>
    </>
  );

  return (
    <div className="page catalog">
      <PageHead kicker={f.brand ? `Brand / ${f.brand}` : "The shop"} lines={f.brand ? [f.brand] : ["Parts", "& kit"]} outline={[1]} lead="Components we ride, fit and stand behind. Filter by part, brand or budget." />

      <div className="catalog-bar">
        <div className="wrap catalog-bar-inner">
          <label className="search">
            <Search />
            <input type="search" value={f.q} onChange={(e) => setParam("q", e.target.value)} placeholder="Search pedals, hubs, tyres…" aria-label="Search products" />
            {f.q && (
              <button type="button" onClick={() => setParam("q", "")} aria-label="Clear search">
                <Close />
              </button>
            )}
          </label>
          <select className="sort" value={f.sort} onChange={(e) => setParam("sort", e.target.value === "featured" ? "" : e.target.value)} aria-label="Sort products">
            {Object.entries(SORTS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-ghost btn-sm filters-btn" onClick={() => setDrawer(true)}>
            <Sliders /> Filters{chips.length ? ` · ${chips.length}` : ""}
          </button>
        </div>
      </div>

      <div className="wrap catalog-body">
        <aside className="facets" aria-label="Filters">
          {facets("side")}
        </aside>

        <section className="catalog-results">
          <div className="results-head">
            <p className="mono dim">{loading ? "Loading the shelves…" : `${results.length} ${results.length === 1 ? "product" : "products"}`}</p>
            {chips.length > 0 && (
              <div className="chips">
                {chips.map((c) => (
                  <button type="button" key={c.k} className="chip" onClick={c.clear}>
                    {c.label} <Close />
                  </button>
                ))}
                <button type="button" className="chip chip--clear" onClick={clearAll}>
                  Clear all
                </button>
              </div>
            )}
          </div>

          {error ? (
            <Empty kicker="Connection" title="Can't reach the shop" action={<button type="button" className="btn btn-primary" onClick={retry}>Try again</button>}>
              {error}
            </Empty>
          ) : loading ? (
            <div className="product-grid">
              {Array.from({ length: 6 }, (_, n) => (
                <ProductCardSkeleton key={n} />
              ))}
            </div>
          ) : results.length === 0 ? (
            <Empty kicker="No match" title="Nothing on this trail" action={<button type="button" className="btn btn-primary" onClick={clearAll}>Reset filters</button>}>
              Loosen a filter, or WhatsApp us for special orders. We can usually get it.
            </Empty>
          ) : (
            <>
              <div className="product-grid">
                {results.slice(0, shown).map((p, n) => (
                  <ProductCard key={p.id} product={p} index={n} />
                ))}
              </div>
              {shown < results.length && (
                <div className="load-more">
                  <div className="load-bar">
                    <span style={{ width: `${(shown / results.length) * 100}%` }} />
                  </div>
                  <p className="mono dim">
                    {shown} of {results.length}
                  </p>
                  <button type="button" className="btn btn-ghost" onClick={() => setShown((s) => s + PAGE)}>
                    Load more
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <div className={`sheet-scrim ${drawer ? "is-open" : ""}`} onClick={() => setDrawer(false)} aria-hidden />
      <aside className={`sheet ${drawer ? "is-open" : ""}`} aria-label="Filters" aria-hidden={!drawer} inert={!drawer}>
        <div className="sheet-head">
          <h3 className="h3">Filters</h3>
          <button type="button" className="icon-btn" onClick={() => setDrawer(false)} aria-label="Close filters">
            <Close />
          </button>
        </div>
        <div className="sheet-body">{facets("sheet")}</div>
        <div className="sheet-foot">
          <button type="button" className="btn btn-ghost" onClick={clearAll}>
            Clear
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setDrawer(false)}>
            Show {results.length}
          </button>
        </div>
      </aside>
    </div>
  );
}
