import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import request from "supertest";
import routes from "../../routes/routes.js";
import { db } from "../../database/index.js";
import { importSkuFolders } from "./legacyImport.js";
import { ADMIN, appAs, makeProduct, resetTables } from "../../test/helpers.js";

const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(40, 1)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40, 2)]);
const admin = appAs(routes, ADMIN, "/api");

let root;
beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "media-"));
  process.env.IMAGES_ROOT = root;
  process.env.ASSET_BASE_URL = "";
});
afterAll(() => {
  delete process.env.IMAGES_ROOT;
  fs.rmSync(root, { recursive: true, force: true });
});

describe("product media", () => {
  let product, red, blue;
  beforeEach(async () => {
    await resetTables("ProductMedia", "StockMovement", "OrderItem", "Cart", "Variations", "Products");
    ({ product, variations: [red, blue] } = await makeProduct({ variations: [{ name: "Red", sku: "DMR-RED" }, { name: "Blue", sku: "DMR-BLUE" }] }));
  });

  it("imports the old SKU folders and leaves orphans in place", async () => {
    const dir = (sku) => path.join(root, "product_images", String(product.id), sku);
    fs.mkdirSync(dir("DMR-RED"), { recursive: true });
    fs.mkdirSync(dir("DMR-BLUE"), { recursive: true });
    fs.mkdirSync(dir("GHOST"), { recursive: true });
    fs.writeFileSync(path.join(dir("DMR-RED"), "image_1.webp"), JPG);
    fs.writeFileSync(path.join(dir("DMR-RED"), "image_2.png"), PNG);
    fs.writeFileSync(path.join(dir("DMR-BLUE"), "image_1.jpg"), JPG);
    fs.writeFileSync(path.join(dir("GHOST"), "image_1.jpg"), JPG);
    const warnings = [];
    const r = await importSkuFolders({ db, log: { warn: (m) => warnings.push(m) } });
    expect(r.moved).toBe(3);
    expect(r.orphans).toEqual([`${product.id}/GHOST`]);
    expect(warnings[0]).toMatch(/GHOST/);
    const rows = await db.ProductMedia.findAll({ where: { variationId: red.id }, order: [["position", "ASC"]] });
    expect(rows.map((m) => m.path)).toEqual([`product_images/${product.id}/${red.id}/${rows[0].id}.jpg`, `product_images/${product.id}/${red.id}/${rows[1].id}.png`]);
    for (const m of rows) expect(fs.existsSync(path.join(root, m.path))).toBe(true);
    expect(fs.existsSync(dir("GHOST"))).toBe(true);
    expect((await importSkuFolders({ db, log: { warn() {} } })).moved).toBe(0);
  });

  it("keeps photos when the SKU is renamed", async () => {
    await request(admin).post(`/api/admin/variations/${red.id}/media`).attach("file", JPG, "a.jpg");
    await red.update({ sku: "DMR-VAULT-RED" });
    const res = await request(admin).post("/api/product/get").send({ productId: product.id });
    expect(res.body.product.variations.find((v) => v.id === red.id).images.files).toHaveLength(1);
  });

  it("refuses big and fake photos", async () => {
    const big = await request(admin).post(`/api/admin/variations/${red.id}/media`).attach("file", Buffer.alloc(6 * 1024 * 1024, 0xff), "big.jpg");
    expect(big.status).toBe(400);
    expect(big.body.message).toBe("Photos must be 5 MB or smaller");
    const fake = await request(admin).post(`/api/admin/variations/${red.id}/media`).attach("file", Buffer.from("<script>alert(1)</script>............"), "x.png");
    expect(fake.status).toBe(400);
    expect(fake.body.message).toBe("Only JPG, PNG or WebP photos");
  });

  it("stores by real type, not by name", async () => {
    const res = await request(admin).post(`/api/admin/variations/${red.id}/media`).attach("file", JPG, "photo.png");
    expect(res.status).toBe(201);
    expect(res.body.url).toMatch(/\.jpg$/);
  });

  it("reorders, moves between variants, copies and removes", async () => {
    const a = (await request(admin).post(`/api/admin/variations/${red.id}/media`).attach("file", JPG, "a.jpg")).body;
    const b = (await request(admin).post(`/api/admin/variations/${red.id}/media`).attach("file", PNG, "b.png")).body;
    await request(admin).patch("/api/admin/media/order").send({ items: [{ id: b.id, position: 0 }, { id: a.id, position: 1 }] });
    let res = await request(admin).post("/api/product/get").send({ productId: product.id });
    expect(res.body.product.variations.find((v) => v.id === red.id).images.files[0]).toMatch(/\.png$/);
    await request(admin).patch("/api/admin/media/order").send({ items: [{ id: a.id, position: 0, variationId: blue.id }] });
    const moved = await db.ProductMedia.findByPk(a.id);
    expect(moved.variationId).toBe(blue.id);
    expect(fs.existsSync(path.join(root, moved.path))).toBe(true);
    const copied = await request(admin).post(`/api/admin/variations/${red.id}/media/copy-from/${blue.id}`);
    expect(copied.body).toHaveLength(1);
    expect((await request(admin).delete(`/api/admin/media/${b.id}`)).status).toBe(204);
    res = await request(admin).post("/api/product/get").send({ productId: product.id });
    expect(res.body.product.variations.find((v) => v.id === red.id).images.files).toHaveLength(1);
  });
});
