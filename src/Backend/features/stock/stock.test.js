import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import routes from "../../routes/routes.js";
import { db } from "../../database/index.js";
import { ADMIN, CUSTOMER, appAs, makeProduct, resetTables } from "../../test/helpers.js";
import { InsufficientStockError, adjustStock, setStockTo } from "./service.js";

const admin = appAs(routes, ADMIN, "/api");
const stockOf = async (id) => (await db.Variations.findByPk(id)).stock;

describe("stock", () => {
  let v;
  beforeEach(async () => {
    await resetTables("StockMovement", "OrderItem", "Cart", "Variations", "Products", "AdminActivity");
    ({ variations: [v] } = await makeProduct({ variations: [{ name: "Red", sku: "DMR-RED", price: 389, stock: 1 }] }));
  });

  it("never goes below zero", async () => {
    await expect(db.sequelize.transaction((t) => adjustStock({ variationId: v.id, delta: -2, reason: "checkout_hold" }, { transaction: t }))).rejects.toBeInstanceOf(InsufficientStockError);
    expect(await stockOf(v.id)).toBe(1);
    expect(await db.StockMovement.count()).toBe(0);
  });

  it("records an adjustment with reason and note", async () => {
    const res = await request(admin).post(`/api/admin/variations/${v.id}/stock`).send({ setTo: 6, expected: 1, reason: "received", note: "PO 1182" });
    expect(res.status).toBe(200);
    expect(res.body.stockAfter).toBe(6);
    const m = await db.StockMovement.findOne();
    expect(m).toMatchObject({ delta: 5, stockAfter: 6, reason: "received", note: "PO 1182", actorId: ADMIN.id, sku: "DMR-RED" });
    const hist = await request(admin).get(`/api/admin/variations/${v.id}/stock-movements`);
    expect(hist.body.items[0]).toMatchObject({ delta: 5, reasonLabel: "Received delivery", productName: "DMR Vault", variationName: "Red" });
    expect((await db.AdminActivity.findOne()).summary).toBe("Set stock of DMR Vault (Red) to 6: Received delivery");
  });

  it("refuses when stock moved since the admin looked", async () => {
    await db.sequelize.transaction((t) => adjustStock({ variationId: v.id, delta: -1, reason: "checkout_hold" }, { transaction: t }));
    const res = await request(admin).post(`/api/admin/variations/${v.id}/stock`).send({ setTo: 6, expected: 1, reason: "received" });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Stock changed to 0 since you opened this. Check and try again.");
    expect(await stockOf(v.id)).toBe(0);
  });

  it("needs an admin reason", async () => {
    const res = await request(admin).post(`/api/admin/variations/${v.id}/stock`).send({ setTo: 6, expected: 1, reason: "checkout_hold" });
    expect(res.status).toBe(400);
    expect(res.body.errors.reason).toBe("Pick a reason");
  });

  it("stays consistent under simultaneous changes", async () => {
    await setStockTo({ variationId: v.id, setTo: 5, expected: 1, reason: "received", actor: ADMIN });
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () => db.sequelize.transaction((t) => adjustStock({ variationId: v.id, delta: -1, reason: "count_correction" }, { transaction: t })))
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(5);
    expect(await stockOf(v.id)).toBe(0);
  });

  it("allows one release per order line", async () => {
    const t1 = () => db.sequelize.transaction((t) => adjustStock({ variationId: v.id, delta: 1, reason: "hold_released", orderItemId: 99 }, { transaction: t }));
    await t1();
    await expect(t1()).rejects.toThrow();
    expect(await stockOf(v.id)).toBe(2);
  });

  it("exports the log as CSV", async () => {
    await setStockTo({ variationId: v.id, setTo: 3, expected: 1, reason: "received", actor: ADMIN });
    const res = await request(admin).get("/api/admin/stock-movements.csv");
    expect(res.headers["content-type"]).toMatch(/text\/csv/);
    expect(res.text).toContain("Received delivery");
  });

  it("is admin-only", async () => {
    expect((await request(appAs(routes, CUSTOMER, "/api")).post(`/api/admin/variations/${v.id}/stock`)).status).toBe(403);
    expect((await request(appAs(routes, null, "/api")).get("/api/admin/stock-movements")).status).toBe(401);
  });
});
