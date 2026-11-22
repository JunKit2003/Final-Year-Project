import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../database/index.js";
import { backfillSnapshot } from "../database/migrations/002-order-item-snapshot.js";
import { makeAccount, makeProduct, resetTables } from "./helpers.js";

async function orderWith(variation, snapshot = {}) {
  const account = await makeAccount();
  const order = await db.Order.create({ userId: account.id, recipientName: "Aiman", shippingAddress: "KL", phoneNumber: "012", totalAmount: 389 });
  const item = await db.OrderItem.create({ orderId: order.id, variationId: variation.id, quantity: 1, price: 389, ...snapshot });
  return { order, item };
}

describe("order-line snapshot", () => {
  beforeEach(() => resetTables("OrderItem", "Order", "Cart", "Variations", "Products"));

  it("keeps the line after its variation is deleted", async () => {
    const { variations: [v] } = await makeProduct({ variations: [{ name: "Red", sku: "DMR-RED", price: 389, stock: 2 }] });
    const { item } = await orderWith(v, { productName: "DMR Vault", variationName: "Red", sku: "DMR-RED" });
    await v.destroy();
    const after = await db.OrderItem.findByPk(item.id);
    expect(after).not.toBeNull();
    expect(after.variationId).toBeNull();
    expect(after.productName).toBe("DMR Vault");
  });

  it("backfills snapshot for existing lines", async () => {
    const { variations: [v] } = await makeProduct({ variations: [{ name: "Red", sku: "DMR-RED", price: 389, stock: 2 }] });
    const { item } = await orderWith(v);
    await backfillSnapshot(db.sequelize);
    const after = await db.OrderItem.findByPk(item.id);
    expect(after.sku).toBe("DMR-RED");
    expect(after.productName).toBe("DMR Vault");
    expect(after.variationName).toBe("Red");
  });
});
