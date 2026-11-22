import { describe, expect, it } from "vitest";
import { db } from "../database/index.js";
import { hasIndex } from "../database/migrate.js";
import { addSkuIndexIfClean } from "../database/migrations/003-product-status-and-variant-fields.js";
import { makeProduct, resetTables } from "./helpers.js";

describe("schema after migrations", () => {
  it("has the new product, variant, account, banner and brand columns", async () => {
    const qi = db.sequelize.getQueryInterface();
    expect(Object.keys(await qi.describeTable("products"))).toEqual(expect.arrayContaining(["status", "featured", "specs", "lowStockThreshold", "version"]));
    expect(Object.keys(await qi.describeTable("variations"))).toEqual(expect.arrayContaining(["compareAtPrice", "position", "archivedAt", "version"]));
    expect(Object.keys(await qi.describeTable("account"))).toContain("isActive");
    expect(Object.keys(await qi.describeTable("banner_image"))).toEqual(expect.arrayContaining(["position", "alt", "linkUrl", "isActive"]));
    expect(Object.keys(await qi.describeTable("brand_images"))).toContain("position");
  });

  it("skips the unique SKU index while duplicates exist", async () => {
    const qi = db.sequelize.getQueryInterface();
    await resetTables("OrderItem", "Cart", "Variations", "Products");
    if (await hasIndex(qi, "variations", "variations_sku_unique")) await qi.removeIndex("variations", "variations_sku_unique");
    await makeProduct({ variations: [{ sku: "X" }, { sku: "X" }] });
    expect(await addSkuIndexIfClean(qi, db.sequelize)).toBe(false);
    expect(await hasIndex(qi, "variations", "variations_sku_unique")).toBe(false);
    await resetTables("Variations", "Products");
    expect(await addSkuIndexIfClean(qi, db.sequelize)).toBe(true);
  });
});
