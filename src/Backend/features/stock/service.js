// The only place stock changes. Each change is a conditional UPDATE (so stock can never
// go below zero, even with simultaneous checkouts) plus a StockMovement row.
import { Op, QueryTypes } from "sequelize";
import { db } from "../../database/index.js";
import { ConflictError, NotFoundError, ValidationError } from "../http.js";
import { STOCK_REASONS } from "../../database/models/stock_movements.js";

export { STOCK_REASONS };
export const ADMIN_REASONS = { received: "Received delivery", damaged: "Damaged or lost", count_correction: "Count correction" };
export const REASON_LABELS = {
  checkout_hold: "Checkout hold",
  hold_released: "Hold released",
  cancel_restock: "Cancel restock",
  import: "CSV import",
  initial: "Starting stock",
  ...ADMIN_REASONS,
};

export class InsufficientStockError extends ConflictError {
  constructor(variationId, available) {
    super(`Only ${available} left.`, { code: "insufficient_stock", variationId, available });
    this.variationId = variationId;
    this.available = available;
  }
}

/**
 * Change stock by `delta`. Must run inside `transaction`.
 * Throws InsufficientStockError when the result would be negative.
 */
export async function adjustStock({ variationId, delta, reason, orderId = null, orderItemId = null, note = null, actor = null }, { transaction }) {
  if (!transaction) throw new Error("adjustStock needs a transaction");
  if (!STOCK_REASONS.includes(reason)) throw new Error(`Unknown stock reason ${reason}`);
  const d = Number(delta);
  if (!Number.isInteger(d)) throw new Error("delta must be an integer");
  const [, affected] = await db.sequelize.query(
    "UPDATE variations SET stock = stock + :d WHERE id = :id AND stock + :d >= 0",
    { replacements: { d, id: variationId }, transaction, type: QueryTypes.UPDATE }
  );
  // Locking (current) read: a plain SELECT could return this transaction's older snapshot.
  const [row] = await db.sequelize.query("SELECT stock, sku FROM variations WHERE id = :id FOR UPDATE", { replacements: { id: variationId }, transaction, type: QueryTypes.SELECT });
  if (!row) throw new NotFoundError("Variant not found.");
  if (!affected) throw new InsufficientStockError(variationId, row.stock);
  await db.StockMovement.create(
    { variationId, sku: row.sku, delta: d, stockAfter: row.stock, reason, orderId, orderItemId, note, actorId: actor?.id ?? null, actorName: actor?.username ?? null },
    { transaction }
  );
  return { stockAfter: row.stock };
}

/**
 * Admin "set stock to N". `expected` is the stock the admin saw; if it has moved since
 * (a sale, another admin), nothing changes and they're asked to check again.
 */
export async function setStockTo({ variationId, setTo, expected, reason, note = null, actor }) {
  const target = Number(setTo);
  const errors = {};
  if (!Number.isInteger(target) || target < 0) errors.setTo = "Stock must be a whole number, 0 or more";
  if (!ADMIN_REASONS[reason]) errors.reason = "Pick a reason";
  if (note && String(note).length > 300) errors.note = "Keep it under 300 characters";
  if (Object.keys(errors).length) throw new ValidationError(errors);
  return db.sequelize.transaction(async (transaction) => {
    const v = await db.Variations.findByPk(variationId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!v) throw new NotFoundError("Variant not found.");
    if (Number(expected) !== v.stock) {
      throw new ConflictError(`Stock changed to ${v.stock} since you opened this. Check and try again.`, { code: "stock_changed", stock: v.stock });
    }
    const delta = target - v.stock;
    if (delta === 0) return { stockAfter: v.stock, changed: false };
    const r = await adjustStock({ variationId, delta, reason, note: note ? String(note).trim() || null : null, actor }, { transaction });
    return { ...r, changed: true };
  });
}

const toJSON = (m) => ({
  id: m.id,
  variationId: m.variationId,
  sku: m.sku,
  delta: m.delta,
  stockAfter: m.stockAfter,
  reason: m.reason,
  reasonLabel: REASON_LABELS[m.reason],
  orderId: m.orderId,
  note: m.note,
  actorName: m.actorName,
  createdAt: m.createdAt,
  productName: m.variation?.product?.name ?? null,
  productId: m.variation?.productId ?? null,
  variationName: m.variation?.name ?? null,
});

export async function listMovements({ variationId, reason, from, to, sku, limit = 50, offset = 0 }) {
  const where = {};
  if (variationId) where.variationId = variationId;
  if (reason && STOCK_REASONS.includes(reason)) where.reason = reason;
  if (sku) where.sku = { [Op.like]: `%${sku}%` };
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt[Op.gte] = new Date(`${from}T00:00:00+08:00`);
    if (to) where.createdAt[Op.lt] = new Date(new Date(`${to}T00:00:00+08:00`).getTime() + 86400000);
  }
  const { rows, count } = await db.StockMovement.findAndCountAll({
    where,
    include: [{ model: db.Variations, as: "variation", attributes: ["id", "name", "productId"], include: [{ model: db.Products, as: "product", attributes: ["name"] }] }],
    order: [["createdAt", "DESC"], ["id", "DESC"]],
    limit,
    offset,
  });
  return { items: rows.map(toJSON), total: count };
}
