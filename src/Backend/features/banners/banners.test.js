import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import request from "supertest";
import routes from "../../routes/routes.js";
import { db } from "../../database/index.js";
import { ADMIN, CUSTOMER, appAs, makeProduct, resetTables } from "../../test/helpers.js";

const admin = appAs(routes, ADMIN, "/api");
const shopper = appAs(routes, CUSTOMER, "/api");
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(40, 1)]);
let root;
beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "ban-"));
  process.env.IMAGES_ROOT = root;
});
afterAll(() => {
  delete process.env.IMAGES_ROOT;
  fs.rmSync(root, { recursive: true, force: true });
});

describe("banners", () => {
  beforeEach(() => resetTables("BannerImage", "AdminActivity"));

  it("uploads, orders, hides and deletes", async () => {
    const ids = [];
    for (let i = 0; i < 3; i++) ids.push((await request(admin).post("/api/admin/banners").attach("file", JPG, "b.jpg").field("alt", `Banner ${i + 1}`)).body.id);
    expect((await request(shopper).post("/api/banner/get").send({})).body.banners.map((b) => b.alt)).toEqual(["Banner 1", "Banner 2", "Banner 3"]);
    await request(admin).patch("/api/admin/banners/order").send({ ids: [ids[2], ids[0], ids[1]] });
    expect((await request(shopper).post("/api/banner/get").send({})).body.banners.map((b) => b.id)).toEqual([ids[2], ids[0], ids[1]]);
    await request(admin).put(`/api/admin/banners/${ids[0]}`).send({ isActive: false, alt: "Hidden", linkUrl: "/catalog" });
    expect((await request(shopper).post("/api/banner/get").send({})).body.banners.map((b) => b.id)).toEqual([ids[2], ids[1]]);
    const del = await request(admin).delete(`/api/admin/banners/${ids[1]}`);
    expect(del.status).toBe(204);
    expect(fs.readdirSync(path.join(root, "banner_images"))).toHaveLength(2);
  });

  it("answers an empty list instead of 404", async () => {
    const res = await request(shopper).post("/api/banner/get").send({});
    expect(res.status).toBe(200);
    expect(res.body.banners).toEqual([]);
  });

  it("refuses unsafe links", async () => {
    const id = (await request(admin).post("/api/admin/banners").attach("file", JPG, "b.jpg")).body.id;
    const res = await request(admin).put(`/api/admin/banners/${id}`).send({ linkUrl: "javascript:alert(1)" });
    expect(res.status).toBe(400);
    expect(res.body.errors.linkUrl).toBe("Link must start with / or https://");
  });
});

describe("brands", () => {
  beforeEach(() => resetTables("StockMovement", "OrderItem", "Cart", "Variations", "Products", "BrandImages", "AdminActivity"));

  it("shows visible brands with live products, logos only when set", async () => {
    await makeProduct({ brand: "Deity" });
    await makeProduct({ brand: "Trek" });
    await makeProduct({ brand: "Ghost", status: "draft" });
    const list = (await request(admin).get("/api/admin/brands")).body.items;
    expect(list.map((b) => [b.brandName, b.productCount, b.imageUrl])).toEqual([["Deity", 1, null], ["Trek", 1, null], ["Ghost", 1, null]]);
    const trek = list.find((b) => b.brandName === "Trek");
    await request(admin).put(`/api/admin/brands/${trek.id}`).attach("file", JPG, "t.jpg");
    const deity = list.find((b) => b.brandName === "Deity");
    await request(admin).put(`/api/admin/brands/${deity.id}`).field("isVisible", "false");
    const pub = (await request(shopper).post("/api/product/getBrandImages").send({})).body.brands;
    expect(pub.map((b) => b.brandName)).toEqual(["Trek"]);
    expect(pub[0].imageUrl).toMatch(/^\/images\/brand_images\/\d+_\d+\.jpg$/);
  });

  it("orders brands", async () => {
    await makeProduct({ brand: "A" });
    await makeProduct({ brand: "B" });
    const [a, b] = (await request(admin).get("/api/admin/brands")).body.items;
    const res = await request(admin).patch("/api/admin/brands/order").send({ ids: [b.id, a.id] });
    expect(res.body.items.map((x) => x.brandName)).toEqual(["B", "A"]);
  });
});
