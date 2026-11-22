// What needs doing today, in one call.
import { Op, QueryTypes } from "sequelize";
import { db } from "../../database/index.js";
import { paymentState } from "../orders/service.js";

const n = (v) => Math.round(Number(v || 0) * 100) / 100;

async function salesSince(days) {
  const [r] = await db.sequelize.query(
    "SELECT COALESCE(SUM(paidAmount - refundedAmount), 0) AS total, COUNT(*) AS orders FROM orders WHERE paidAt >= :since AND paidAmount > 0",
    { replacements: { since: new Date(Date.now() - days * 86400000) }, type: QueryTypes.SELECT }
  );
  return { total: n(r.total), orders: Number(r.orders) };
}

export async function dashboard() {
  const [toShip, pendingRefunds, lowStock, sales7, sales30, recent, dups, pendingCheckouts] = await Promise.all([
    db.Order.count({ where: { status: "Paid" } }),
    db.OrderRefund.count({ where: { status: "pending" } }),
    db.sequelize.query(
      `SELECT v.id AS variationId, p.id AS productId, p.name, v.name AS variant, v.sku, v.stock, p.lowStockThreshold AS threshold
         FROM variations v JOIN products p ON p.id = v.productId
        WHERE v.archivedAt IS NULL AND p.status = 'live' AND v.stock <= p.lowStockThreshold
        ORDER BY v.stock ASC, p.name ASC LIMIT 50`,
      { type: QueryTypes.SELECT }
    ),
    salesSince(7),
    salesSince(30),
    db.Order.findAll({ where: { status: { [Op.ne]: "Pending" } }, order: [["createdAt", "DESC"]], limit: 5 }),
    db.sequelize.query("SELECT sku FROM variations GROUP BY sku HAVING COUNT(*) > 1", { type: QueryTypes.SELECT }),
    db.Order.count({ where: { status: "Pending" } }),
  ]);
  return {
    toShip,
    pendingRefunds,
    pendingCheckouts,
    lowStock: lowStock.map((r) => ({ ...r, stock: Number(r.stock), threshold: Number(r.threshold) })),
    sales7,
    sales30,
    recentOrders: recent.map((o) => ({ id: o.id, createdAt: o.createdAt, recipientName: o.recipientName, status: o.status, totalAmount: n(o.totalAmount), paymentState: paymentState(o) })),
    duplicateSkus: dups.map((d) => d.sku),
  };
}
