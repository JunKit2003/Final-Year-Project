import { describe, expect, it } from "vitest";
import {
  cartLineState,
  cartTotal,
  countBy,
  filterProducts,
  formatRM,
  indexVariations,
  orderProgress,
  priceRange,
  productImages,
  relatedProducts,
  stockState,
  totalStock,
} from "./shop";

const v = (id, price, stock, files = [], name = `V${id}`) => ({ id, price: String(price), stock, name, images: { files } });

const products = [
  { id: 1, name: "Bucktooth Pedals", brand: "Deity", category: "Pedals", variations: [v(11, 459, 4, ["a.jpg", "b.jpg"], "Black"), v(12, 489, 0, ["b.jpg", "c.jpg"], "Red")] },
  { id: 2, name: "Hydra Hub", brand: "Industry Nine", category: "Hubs", variations: [v(21, 1890, 2)] },
  { id: 3, name: "Wild Enduro Tyre", brand: "Michelin", category: "Tyres", variations: [v(31, 320, 0)] },
  { id: 4, name: "Skywire Stem", brand: "Deity", category: "Stems", variations: [v(41, 399, 10)] },
];

describe("formatting and product helpers", () => {
  it("formats ringgit", () => {
    expect(formatRM("459.00").replace(/\s/g, " ")).toBe("RM 459.00");
  });

  it("collects unique images across variations", () => {
    expect(productImages(products[0])).toEqual(["a.jpg", "b.jpg", "c.jpg"]);
    expect(productImages({})).toEqual([]);
  });

  it("computes price range from decimal strings", () => {
    expect(priceRange(products[0])).toEqual({ min: 459, max: 489 });
    expect(priceRange({ variations: [] })).toEqual({ min: 0, max: 0 });
  });

  it("sums stock and labels it", () => {
    expect(totalStock(products[0])).toBe(4);
    expect(stockState(0).key).toBe("out");
    expect(stockState(2)).toEqual({ key: "low", label: "Only 2 left" });
    expect(stockState(9).key).toBe("in");
  });
});

describe("cart", () => {
  const items = [
    { id: 1, quantity: 2, variation: { price: "100.50", stock: 5 } },
    { id: 2, quantity: 3, variation: { price: "10", stock: 2 } },
    { id: 3, quantity: 1, variation: { price: "5", stock: 0 } },
  ];

  it("flags lines that cannot be bought", () => {
    expect(cartLineState(items[0]).ok).toBe(true);
    expect(cartLineState(items[1])).toEqual({ ok: false, reason: "Only 2 available" });
    expect(cartLineState(items[2])).toEqual({ ok: false, reason: "Out of stock" });
  });

  it("totals all or only selected lines", () => {
    expect(cartTotal(items)).toBeCloseTo(236);
    expect(cartTotal(items, [1])).toBeCloseTo(201);
    expect(cartTotal(items, [])).toBe(0);
  });
});

describe("catalog filtering", () => {
  it("counts facets alphabetically", () => {
    expect(countBy(products, "brand")).toEqual([
      { name: "Deity", count: 2 },
      { name: "Industry Nine", count: 1 },
      { name: "Michelin", count: 1 },
    ]);
  });

  it("filters by brand case-insensitively (brand comes from the URL)", () => {
    expect(filterProducts(products, { brand: "deity" }).map((p) => p.id).sort()).toEqual([1, 4]);
  });

  it("matches every search word across name, brand and variation", () => {
    expect(filterProducts(products, { q: "deity red" }).map((p) => p.id)).toEqual([1]);
    expect(filterProducts(products, { q: "nothing" })).toEqual([]);
  });

  it("filters by overlapping price range and stock", () => {
    expect(filterProducts(products, { min: 480, max: 1000 }).map((p) => p.id)).toEqual([1]);
    expect(filterProducts(products, { inStock: true }).map((p) => p.id)).not.toContain(3);
  });

  it("sorts", () => {
    expect(filterProducts(products, { sort: "price-asc" }).map((p) => p.id)).toEqual([3, 4, 1, 2]);
    expect(filterProducts(products, { sort: "name" })[0].name).toBe("Bucktooth Pedals");
    // featured: in stock first, newest first
    expect(filterProducts(products, {}).map((p) => p.id)).toEqual([4, 2, 1, 3]);
  });

  it("finds related products, category first", () => {
    expect(relatedProducts(products, products[0]).map((p) => p.id)).toEqual([4]);
  });

  it("indexes variations for order lines", () => {
    expect(indexVariations(products).get(21).product.name).toBe("Hydra Hub");
  });
});

describe("orders and shop hours", () => {
  it("maps status to progress", () => {
    expect(orderProgress("Pending")).toBe(0);
    expect(orderProgress("Shipped")).toBe(2);
    expect(orderProgress("Cancelled")).toBe(-1);
  });
});
