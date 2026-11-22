import { DEFAULTS, shopStatus as sharedShopStatus } from "../../../shared/site-schema.js";

// Pure helpers for products, prices, cart and catalog filtering. No React, no network: unit-tested.

const rm = new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR", minimumFractionDigits: 2 });

export const formatRM = (value) => rm.format(Number(value) || 0);

export const toNumber = (v) => {
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

/** All variation images of a product, de-duplicated, in variation order. */
export const productImages = (product) => {
  const seen = new Set();
  const out = [];
  for (const v of product?.variations || []) {
    for (const src of v?.images?.files || []) {
      if (src && !seen.has(src)) {
        seen.add(src);
        out.push(src);
      }
    }
  }
  return out;
};

export const priceRange = (product) => {
  const prices = (product?.variations || []).map((v) => toNumber(v.price)).filter((p) => p > 0);
  if (!prices.length) return { min: 0, max: 0 };
  return { min: Math.min(...prices), max: Math.max(...prices) };
};

export const totalStock = (product) =>
  (product?.variations || []).reduce((sum, v) => sum + Math.max(0, Number(v.stock) || 0), 0);

export const stockState = (stock) => {
  const s = Number(stock) || 0;
  if (s <= 0) return { key: "out", label: "Out of stock" };
  if (s <= 3) return { key: "low", label: `Only ${s} left` };
  return { key: "in", label: "In stock" };
};

/** Cart line is purchasable when in stock and the quantity fits the stock. */
export const cartLineState = (item) => {
  const stock = Number(item?.variation?.stock) || 0;
  const qty = Number(item?.quantity) || 0;
  if (stock <= 0) return { ok: false, reason: "Out of stock" };
  if (qty > stock) return { ok: false, reason: `Only ${stock} available` };
  return { ok: true, reason: "" };
};

export const lineTotal = (item) => toNumber(item?.variation?.price) * (Number(item?.quantity) || 0);

export const cartTotal = (items, selectedIds) =>
  (items || []).filter((i) => !selectedIds || selectedIds.includes(i.id)).reduce((sum, i) => sum + lineTotal(i), 0);

export const countBy = (items, key) => {
  const counts = new Map();
  for (const it of items || []) {
    const k = it?.[key];
    if (k) counts.set(k, (counts.get(k) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([name, count]) => ({ name, count }));
};

export const SORTS = {
  featured: "Featured",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  name: "Name A to Z",
};

/**
 * Filter + sort the catalog.
 * opts: { q, category, brand, min, max, inStock, sort }
 */
export const filterProducts = (products, opts = {}) => {
  const q = (opts.q || "").trim().toLowerCase();
  const brand = (opts.brand || "").toLowerCase();
  const min = opts.min === "" || opts.min == null ? null : toNumber(opts.min);
  const max = opts.max === "" || opts.max == null ? null : toNumber(opts.max);

  const list = (products || []).filter((p) => {
    if (opts.category && p.category !== opts.category) return false;
    if (brand && (p.brand || "").toLowerCase() !== brand) return false;
    if (q) {
      const hay = `${p.name} ${p.brand} ${p.category} ${(p.variations || []).map((v) => v.name).join(" ")}`.toLowerCase();
      if (!q.split(/\s+/).every((word) => hay.includes(word))) return false;
    }
    const { min: pMin, max: pMax } = priceRange(p);
    if (min != null && pMax < min) return false;
    if (max != null && pMin > max) return false;
    if (opts.inStock && totalStock(p) === 0) return false;
    return true;
  });

  const byMin = (p) => priceRange(p).min;
  switch (opts.sort) {
    case "price-asc":
      return list.sort((a, b) => byMin(a) - byMin(b));
    case "price-desc":
      return list.sort((a, b) => byMin(b) - byMin(a));
    case "name":
      return list.sort((a, b) => a.name.localeCompare(b.name));
    default:
      // Featured: in-stock first, then newest (highest id).
      return list.sort((a, b) => (totalStock(b) > 0) - (totalStock(a) > 0) || b.id - a.id);
  }
};

/** Related products: same brand or category, excluding the product itself. */
export const relatedProducts = (products, product, limit = 4) =>
  (products || [])
    .filter((p) => p.id !== product?.id && (p.brand === product?.brand || p.category === product?.category))
    .sort((a, b) => (b.category === product?.category) - (a.category === product?.category) || (b.brand === product?.brand) - (a.brand === product?.brand))
    .slice(0, limit);

/** Map of variationId -> { product, variation } for order lines. */
export const indexVariations = (products) => {
  const map = new Map();
  for (const p of products || []) for (const v of p.variations || []) map.set(v.id, { product: p, variation: v });
  return map;
};

export const ORDER_STEPS = ["Pending", "Paid", "Shipped", "Completed"];

export const orderProgress = (status) => {
  if (status === "Cancelled") return -1;
  return Math.max(0, ORDER_STEPS.indexOf(status));
};

/** Open/closed with the default hours. Pages use useSite() hours; this stays for tests. */
export const shopStatus = (now = new Date()) => sharedShopStatus(DEFAULTS.hours, now);

