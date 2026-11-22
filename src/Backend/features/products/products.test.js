import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import request from "supertest";
import routes from "../../routes/routes.js";
import { db } from "../../database/index.js";
import { ADMIN, CUSTOMER, appAs, makeAccount, makeProduct, resetTables } from "../../test/helpers.js";

const admin = appAs(routes, ADMIN, "/api");
const shopper = appAs(routes, CUSTOMER, "/api");
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(40, 1)]);

const payload = (over = {}) => ({
  name: "DMR Vault",
  brand: "DMR",
  category: "Pedals",
  description: "Flat pedal.\nGrippy.",
  status: "live",
  featured: false,
  specs: [{ label: "Weight", value: "435 g" }],
  lowStockThreshold: 2,
  variations: [
    { name: "Red", sku: "DMR-RED", price: 389, stock: 4 },
    { name: "Blue", sku: "DMR-BLUE", price: 389, stock: 2 },
  ],
  ...over,
});

async function orderLine(variationId) {
  const acct = await makeAccount();
  const o = await db.Order.create({ userId: acct.id, recipientName: "A", shippingAddress: "KL", phoneNumber: "012", totalAmount: 1 });
  return db.OrderItem.create({ orderId: o.id, variationId, quantity: 1, price: 1 });
}

let root;
beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "prod-"));
  process.env.IMAGES_ROOT = root;
});
afterAll(() => {
  delete process.env.IMAGES_ROOT;
  fs.rmSync(root, { recursive: true, force: true });
});

describe("admin products", () => {
  beforeEach(() => resetTables("ProductMedia", "StockMovement", "AdminActivity", "OrderItem", "Order", "Cart", "Variations", "Products", "BrandImages"));

  it("creates a product with variants and starting stock", async () => {
    const res = await request(admin).post("/api/admin/products").send(payload());
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: "DMR Vault", status: "live", specs: [{ label: "Weight", value: "435 g" }], lowStockThreshold: 2, version: 1 });
    expect(res.body.variations.map((v) => [v.sku, v.stock])).toEqual([["DMR-RED", 4], ["DMR-BLUE", 2]]);
    expect(await db.StockMovement.count({ where: { reason: "initial" } })).toBe(2);
    expect(await db.BrandImages.count({ where: { brandName: "DMR" } })).toBe(1);
    expect((await db.AdminActivity.findOne()).summary).toBe("Created product DMR Vault");
  });

  it("names the product that already uses a SKU", async () => {
    await request(admin).post("/api/admin/products").send(payload());
    const res = await request(admin).post("/api/admin/products").send(payload({ name: "Other", variations: [{ name: "A", sku: "X-1", price: 1, stock: 0 }, { name: "B", sku: "dmr-red", price: 1, stock: 0 }] }));
    expect(res.status).toBe(400);
    expect(res.body.errors["variations.1.sku"]).toBe("SKU DMR-RED is already used by DMR Vault (Red)");
  });

  it.each([
    [{ name: "" }, "name", "Name is required"],
    [{ variations: [{ name: "Red", sku: "A", price: 389, compareAtPrice: 300, stock: 1 }] }, "variations.0.compareAtPrice", "Was price must be more than the price"],
    [{ variations: [{ name: "Red", sku: "A", price: 1, stock: 1 }, { name: "Blue", sku: "a", price: 1, stock: 1 }] }, "variations.1.sku", "SKU a is used twice"],
    [{ variations: [] }, "variations", "Add at least one variant"],
    [{ variations: [{ name: "Red", sku: "A", price: -1, stock: 1 }] }, "variations.0.price", "Price must be 0 or more"],
  ])("field error %#", async (over, field, message) => {
    const res = await request(admin).post("/api/admin/products").send(payload(over));
    expect(res.status).toBe(400);
    expect(res.body.errors[field]).toBe(message);
  });

  it("updates without touching stock and refuses a stale version", async () => {
    const created = (await request(admin).post("/api/admin/products").send(payload())).body;
    const body = { ...payload(), version: created.version, variations: created.variations.map((v) => ({ ...v, price: 399, stock: 999 })) };
    const res = await request(admin).put(`/api/admin/products/${created.id}`).send(body);
    expect(res.status).toBe(200);
    expect(res.body.version).toBe(2);
    expect(res.body.variations.map((v) => [v.price, v.stock])).toEqual([[399, 4], [399, 2]]);
    const stale = await request(admin).put(`/api/admin/products/${created.id}`).send(body);
    expect(stale.status).toBe(409);
    expect(stale.body.message).toBe("Someone else saved this product since you opened it. Reload to see their changes.");
  });

  it("an open editor can't overwrite a quick price edit", async () => {
    const c = (await request(admin).post("/api/admin/products").send(payload())).body;
    await request(admin).patch(`/api/admin/variations/${c.variations[0].id}`).send({ price: 350, version: c.variations[0].version });
    const res = await request(admin).put(`/api/admin/products/${c.id}`).send({ ...payload(), version: c.version, variations: c.variations });
    expect(res.status).toBe(409);
    expect(Number((await db.Variations.findByPk(c.variations[0].id)).price)).toBe(350);
  });

  it("swaps SKUs between two variants in one save", async () => {
    const c = (await request(admin).post("/api/admin/products").send(payload())).body;
    const [r, b] = c.variations;
    const res = await request(admin).put(`/api/admin/products/${c.id}`).send({ ...payload(), version: 1, variations: [{ ...r, sku: "DMR-BLUE" }, { ...b, sku: "DMR-RED" }] });
    expect(res.status).toBe(200);
    expect(res.body.variations.map((v) => v.sku)).toEqual(["DMR-BLUE", "DMR-RED"]);
  });

  it("removing an unordered variant that sits in a cart deletes it and the cart line", async () => {
    const c = (await request(admin).post("/api/admin/products").send(payload())).body;
    const acct = await makeAccount();
    await db.Cart.create({ accountId: acct.id, variationId: c.variations[1].id, quantity: 1 });
    const res = await request(admin).put(`/api/admin/products/${c.id}`).send({ ...payload(), version: 1, variations: [c.variations[0]] });
    expect(res.status).toBe(200);
    expect(await db.Variations.findByPk(c.variations[1].id)).toBeNull();
    expect(await db.Cart.count()).toBe(0);
  });

  it("removing an ordered variant archives it and hides it from shoppers", async () => {
    const c = (await request(admin).post("/api/admin/products").send(payload())).body;
    await orderLine(c.variations[1].id);
    await request(admin).put(`/api/admin/products/${c.id}`).send({ ...payload(), version: 1, variations: [c.variations[0]] });
    expect((await db.Variations.findByPk(c.variations[1].id)).archivedAt).not.toBeNull();
    const pub = await request(shopper).post("/api/product/get").send({});
    expect(pub.body.products[0].variations.map((v) => v.sku)).toEqual(["DMR-RED"]);
  });

  it("only deletes products that were never ordered", async () => {
    const c = (await request(admin).post("/api/admin/products").send(payload())).body;
    await orderLine(c.variations[0].id);
    const res = await request(admin).delete(`/api/admin/products/${c.id}`);
    expect(res.status).toBe(409);
    expect(res.body.message).toBe("This product has orders. Archive it instead.");
    const other = (await request(admin).post("/api/admin/products").send(payload({ name: "B", variations: [{ name: "x", sku: "B-1", price: 1, stock: 0 }] }))).body;
    expect((await request(admin).delete(`/api/admin/products/${other.id}`)).status).toBe(204);
  });

  it("hides drafts from shoppers but not admins", async () => {
    const c = (await request(admin).post("/api/admin/products").send(payload({ status: "draft" }))).body;
    expect((await request(shopper).post("/api/product/get").send({})).body.products).toEqual([]);
    expect((await request(shopper).post("/api/product/get").send({ productId: c.id })).status).toBe(404);
    const asAdmin = await request(admin).post("/api/product/get").send({ productId: c.id });
    expect(asAdmin.status).toBe(200);
    expect(asAdmin.body.product.status).toBe("draft");
  });

  it("duplicates as a draft with -COPY SKUs and photos", async () => {
    const c = (await request(admin).post("/api/admin/products").send(payload())).body;
    await request(admin).post(`/api/admin/variations/${c.variations[0].id}/media`).attach("file", JPG, "a.jpg");
    const res = await request(admin).post(`/api/admin/products/${c.id}/duplicate`);
    expect(res.status).toBe(201);
    const copy = (await request(admin).get(`/api/admin/products/${res.body.id}`)).body;
    expect(copy.status).toBe("draft");
    expect(copy.name).toBe("DMR Vault (copy)");
    expect(copy.variations.map((v) => [v.sku, v.stock])).toEqual([["DMR-RED-COPY", 0], ["DMR-BLUE-COPY", 0]]);
    expect(copy.variations[0].media).toHaveLength(1);
    const again = (await request(admin).post(`/api/admin/products/${c.id}/duplicate`)).body;
    expect((await request(admin).get(`/api/admin/products/${again.id}`)).body.variations[0].sku).toBe("DMR-RED-COPY2");
  });

  it("bulk delete archives the ordered ones instead", async () => {
    const ids = [];
    for (const n of [1, 2, 3]) ids.push((await request(admin).post("/api/admin/products").send(payload({ name: `P${n}`, variations: [{ name: "x", sku: `S-${n}`, price: 1, stock: 0 }] }))).body);
    await orderLine(ids[0].variations[0].id);
    const res = await request(admin).post("/api/admin/products/bulk").send({ ids: ids.map((p) => p.id), action: "delete" });
    expect(res.body).toEqual({ updated: 0, deleted: 2, archivedInstead: 1 });
    expect((await db.Products.findByPk(ids[0].id)).status).toBe("archived");
  });

  it("bulk sets status and category", async () => {
    const { product: a } = await makeProduct();
    const { product: b } = await makeProduct();
    await request(admin).post("/api/admin/products/bulk").send({ ids: [a.id, b.id], action: "category", value: "Grips" });
    expect((await db.Products.findByPk(b.id)).category).toBe("Grips");
    await request(admin).post("/api/admin/products/bulk").send({ ids: [a.id], action: "status", value: "draft" });
    expect((await db.Products.findByPk(a.id)).status).toBe("draft");
  });

  it("searches by SKU and filters low stock", async () => {
    await request(admin).post("/api/admin/products").send(payload());
    await request(admin).post("/api/admin/products").send(payload({ name: "Other", lowStockThreshold: 1, variations: [{ name: "x", sku: "OTHER-1", price: 1, stock: 9 }] }));
    const bySku = await request(admin).get("/api/admin/products").query({ q: "dmr-red" });
    expect(bySku.body.items.map((p) => p.name)).toEqual(["DMR Vault"]);
    const low = await request(admin).get("/api/admin/products").query({ stock: "low" });
    expect(low.body.items.map((p) => p.name)).toEqual(["DMR Vault"]);
    expect(low.body.items[0]).toMatchObject({ variantCount: 2, minPrice: 389, totalStock: 6, stockFlag: "low" });
  });

  it("quick-edits a price with its version", async () => {
    const { variations: [v] } = await makeProduct();
    const ok = await request(admin).patch(`/api/admin/variations/${v.id}`).send({ price: 120, version: 1 });
    expect(ok.status).toBe(200);
    expect((await request(admin).patch(`/api/admin/variations/${v.id}`).send({ price: 130, version: 1 })).status).toBe(409);
  });

  it.each([
    ["get", "/api/admin/products"],
    ["post", "/api/admin/products"],
    ["post", "/api/admin/products/bulk"],
    ["put", "/api/admin/products/1"],
    ["delete", "/api/admin/products/1"],
    ["post", "/api/admin/products/1/duplicate"],
    ["patch", "/api/admin/variations/1"],
  ])("%s %s is admin-only", async (m, p) => {
    expect((await request(appAs(routes, null, "/api"))[m](p)).status).toBe(401);
    expect((await request(shopper)[m](p)).status).toBe(403);
  });
});
