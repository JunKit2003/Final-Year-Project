import { describe, expect, it } from "vitest";
import { editorReducer, emptyProduct, fromProduct, isDirty, toPayload } from "./editorState";

const saved = {
  id: 7, name: "DMR Vault", brand: "DMR", category: "Pedals", description: "", status: "live", featured: false, specs: [], lowStockThreshold: 3, version: 2,
  variations: [
    { id: 1, name: "Red", sku: "DMR-RED", price: 389, compareAtPrice: null, stock: 4, intendedUse: "", position: 0, media: [], ordered: true },
    { id: 2, name: "Blue", sku: "DMR-BLUE", price: 389, compareAtPrice: 450, stock: 2, intendedUse: "", position: 1, media: [], ordered: false },
  ],
};

describe("product editor state", () => {
  it("adding then removing a variant is not a change", () => {
    const a = fromProduct(saved);
    let s = editorReducer(a, { type: "addVariant" });
    expect(isDirty(a, s)).toBe(true);
    s = editorReducer(s, { type: "removeVariant", index: 2 });
    expect(isDirty(a, s)).toBe(false);
  });

  it("never sends stock for existing variants", () => {
    const p = toPayload(editorReducer(fromProduct(saved), { type: "addVariant" }));
    expect(p.variations[0]).not.toHaveProperty("stock");
    expect(p.variations[2]).toMatchObject({ stock: 0, sku: "" });
    expect(p.version).toBe(2);
  });

  it("duplicating a row makes a new variant with a -COPY SKU", () => {
    const s = editorReducer(fromProduct(saved), { type: "duplicateVariant", index: 0 });
    expect(s.variations[1]).toMatchObject({ id: null, name: "Red", sku: "DMR-RED-COPY", stock: 0 });
    expect(s.variations).toHaveLength(3);
  });

  it("reordering rewrites positions", () => {
    const s = editorReducer(fromProduct(saved), { type: "moveVariant", from: 1, to: 0 });
    expect(toPayload(s).variations.map((v) => [v.sku, v.position])).toEqual([["DMR-BLUE", 0], ["DMR-RED", 1]]);
  });

  it("blank was price becomes null", () => {
    let s = fromProduct(saved);
    s = editorReducer(s, { type: "setVariant", index: 1, field: "compareAtPrice", value: "" });
    expect(toPayload(s).variations[1].compareAtPrice).toBeNull();
  });

  it("drops empty spec rows", () => {
    let s = emptyProduct();
    s = editorReducer(s, { type: "set", field: "specs", value: [{ label: "Weight", value: "435 g" }, { label: "", value: "" }] });
    expect(toPayload(s).specs).toEqual([{ label: "Weight", value: "435 g" }]);
  });
});
