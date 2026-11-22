import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import routes from "../../routes/routes.js";
import { db } from "../../database/index.js";
import { ADMIN, appAs, makeProduct, resetTables } from "../../test/helpers.js";

const admin = appAs(routes, ADMIN, "/api");

describe("taxonomy", () => {
  beforeEach(() => resetTables("StockMovement", "OrderItem", "Cart", "Variations", "Products", "BrandImages", "AdminActivity"));

  it("merges duplicate brands and keeps one logo row", async () => {
    for (let i = 0; i < 2; i++) await makeProduct({ brand: "Oneup" });
    for (let i = 0; i < 5; i++) await makeProduct({ brand: "OneUp Components" });
    await db.BrandImages.update({ imagePath: "images/brand_images/oneup.png" }, { where: { brandName: "OneUp Components" } });
    const res = await request(admin).post("/api/admin/taxonomy/rename").send({ kind: "brand", from: "Oneup", to: "OneUp Components" });
    expect(res.body).toEqual({ moved: 2 });
    const t = (await request(admin).get("/api/admin/taxonomy")).body;
    expect(t.brands).toEqual([{ name: "OneUp Components", count: 7, brandImageId: expect.any(Number) }]);
    expect(await db.BrandImages.count()).toBe(1);
    expect((await db.BrandImages.findOne()).imagePath).toBe("images/brand_images/oneup.png");
  });

  it("renames a category", async () => {
    await makeProduct({ category: "Tyres" });
    await request(admin).post("/api/admin/taxonomy/rename").send({ kind: "category", from: "Tyres", to: "Tires" });
    expect((await request(admin).get("/api/admin/taxonomy")).body.categories).toEqual([{ name: "Tires", count: 1 }]);
  });

  it("needs a new name", async () => {
    const res = await request(admin).post("/api/admin/taxonomy/rename").send({ kind: "category", from: "Tyres", to: " " });
    expect(res.status).toBe(400);
    expect(res.body.errors.to).toBe("Enter the new name");
  });
});
