import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import routes from "../../routes/routes.js";
import { db } from "../../database/index.js";
import { ADMIN, appAs, makeAccount, makeProduct, resetTables } from "../../test/helpers.js";

const admin = appAs(routes, ADMIN, "/api");

describe("dashboard", () => {
  beforeEach(() => resetTables("OrderRefund", "OrderEvent", "StockMovement", "OrderItem", "Order", "Cart", "Variations", "Products"));

  it("counts what needs doing", async () => {
    const acct = await makeAccount();
    for (let i = 0; i < 3; i++) await db.Order.create({ userId: acct.id, recipientName: "A", shippingAddress: "KL", phoneNumber: "012", totalAmount: 100, status: "Paid", paidAmount: 100, paidAt: new Date() });
    const o = await db.Order.findOne();
    await o.update({ refundedAmount: 40 });
    await makeProduct({ lowStockThreshold: 3, variations: [{ sku: "LOW-1", stock: 2 }, { sku: "OK-1", stock: 10 }, { sku: "OUT-1", stock: 0 }] });
    await makeProduct({ status: "draft", variations: [{ sku: "DRAFT-1", stock: 0 }] });
    const res = await request(admin).get("/api/admin/dashboard");
    expect(res.body.toShip).toBe(3);
    expect(res.body.lowStock.map((v) => v.sku)).toEqual(["OUT-1", "LOW-1"]);
    expect(res.body.sales7).toEqual({ total: 260, orders: 3 });
    expect(res.body.recentOrders).toHaveLength(3);
    expect(res.body.duplicateSkus).toEqual([]);
  });
});
