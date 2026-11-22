// Checkout, payment confirmation and stock holds.
//
// - Starting checkout holds stock straight away (one "checkout_hold" movement per line), so
//   the last unit can't be sold twice. The Stripe session expires after 30 minutes.
// - Paying keeps the hold: nothing is deducted again. The success page and the webhook both
//   call markPaidFromSession; whichever comes first wins, the other is a no-op.
// - An abandoned checkout gives its stock back (customer cancel, Stripe's expiry webhook, or
//   the sweep after 35 minutes).
// - Stripe is never called inside a database transaction.
import { Op } from "sequelize";
import { db } from "../../database/index.js";
import { getStripe } from "../../config/stripe.js";
import { adjustStock, InsufficientStockError } from "../stock/service.js";
import { ConflictError, HttpError, ValidationError } from "../http.js";

export const HOLD_MINUTES = 30;
export const SWEEP_AFTER_MINUTES = 35;

const money = (n) => Math.round(Number(n) * 100) / 100;
const label = (productName, variationName) => (variationName ? `${productName} (${variationName})` : productName);

export async function addOrderEvent(orderId, fields, { transaction } = {}) {
  return db.OrderEvent.create({ orderId, ...fields, actorId: fields.actor?.id ?? fields.actorId ?? null, actorName: fields.actor?.username ?? fields.actorName ?? null }, { transaction });
}

/** Give back the stock held by an order's lines (once per line). */
export async function releaseHold(order, { transaction, actor = null }) {
  const items = order.items || (await db.OrderItem.findAll({ where: { orderId: order.id }, transaction }));
  for (const item of items) {
    if (!item.variationId) continue;
    const held = await db.StockMovement.findOne({ where: { orderItemId: item.id, reason: "checkout_hold" }, transaction });
    if (!held) continue;
    const released = await db.StockMovement.findOne({ where: { orderItemId: item.id, reason: "hold_released" }, transaction });
    if (released) continue;
    await adjustStock({ variationId: item.variationId, delta: -held.delta, reason: "hold_released", orderId: order.id, orderItemId: item.id, actor }, { transaction });
  }
}

/**
 * Validate the cart lines, hold stock and create a Pending order, then open a Stripe
 * Checkout session. Returns { order, session }.
 */
export async function startCheckout({ userId, items, shippingAddress, recipientName, phoneNumber, publicUrl }) {
  const stripe = getStripe(); // throws PaymentsNotConfiguredError before anything is written

  const qty = new Map();
  for (const it of items || []) {
    const id = Number(it.variation_id);
    const q = Number(it.quantity);
    if (!Number.isInteger(id) || !Number.isInteger(q) || q < 1) throw new ValidationError({ items: "Each item needs a variant and a quantity of at least 1" }, "Each item requires 'variation_id' and 'quantity'!");
    qty.set(id, (qty.get(id) || 0) + q);
  }
  if (!qty.size) throw new ValidationError({ items: "Your cart is empty" }, "Missing or invalid 'items' in the request body!");

  let order;
  try {
    order = await db.sequelize.transaction(async (transaction) => {
      const variations = await db.Variations.findAll({
        where: { id: [...qty.keys()], archivedAt: null },
        include: [{ model: db.Products, as: "product", attributes: ["id", "name", "status"] }],
        transaction,
      });
      const byId = new Map(variations.filter((v) => v.product?.status === "live").map((v) => [v.id, v]));
      for (const id of qty.keys()) {
        if (!byId.has(id)) throw new ValidationError({ items: "An item in your cart is no longer available" }, "An item in your cart is no longer available. Please remove it and try again.");
      }
      const total = money([...qty].reduce((sum, [id, q]) => sum + Number(byId.get(id).price) * q, 0));
      const created = await db.Order.create({ userId, shippingAddress, recipientName, phoneNumber, totalAmount: total, status: "Pending" }, { transaction });
      created.items = [];
      for (const [id, q] of qty) {
        const v = byId.get(id);
        const item = await db.OrderItem.create(
          { orderId: created.id, variationId: id, quantity: q, price: v.price, productName: v.product.name, variationName: v.name, sku: v.sku },
          { transaction }
        );
        created.items.push(item);
        try {
          await adjustStock({ variationId: id, delta: -q, reason: "checkout_hold", orderId: created.id, orderItemId: item.id }, { transaction });
        } catch (error) {
          if (error instanceof InsufficientStockError) {
            error.itemLabel = label(v.product.name, v.name);
          }
          throw error;
        }
      }
      return created;
    });
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      // Bring the cart in line with what's actually there.
      const available = error.available;
      if (available > 0) await db.Cart.update({ quantity: available }, { where: { accountId: userId, variationId: error.variationId } });
      else await db.Cart.destroy({ where: { accountId: userId, variationId: error.variationId } });
      throw new ConflictError(`Only ${available} of ${error.itemLabel} left. We've updated your cart.`, { code: "insufficient_stock", variationId: error.variationId, available });
    }
    throw error;
  }

  const base = String(publicUrl || "").replace(/\/+$/, "");
  let session;
  try {
    session = await stripe.checkout.sessions.create({
      // payment_method_types was removed in API 2026-09-30.endive (400 if sent).
      allowed_payment_method_types: ["card"],
      mode: "payment",
      line_items: order.items.map((i) => ({
        price_data: { currency: "myr", product_data: { name: label(i.productName, i.variationName) }, unit_amount: Math.round(Number(i.price) * 100) },
        quantity: i.quantity,
      })),
      success_url: `${base}/paymentSuccess?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/paymentFailed?session_id={CHECKOUT_SESSION_ID}`,
      expires_at: Math.floor(Date.now() / 1000) + HOLD_MINUTES * 60,
      metadata: { orderId: String(order.id), userId: String(userId) },
    });
  } catch (error) {
    console.error("Stripe checkout could not start:", error?.message || error);
    await db.sequelize.transaction(async (transaction) => {
      await releaseHold(order, { transaction });
      await order.update({ status: "Cancelled" }, { transaction });
      await addOrderEvent(order.id, { type: "status", fromStatus: "Pending", toStatus: "Cancelled", note: "Checkout couldn't start" }, { transaction });
    });
    throw new HttpError(502, "We couldn't start checkout. Please try again.");
  }

  await order.update({ stripeSessionId: session.id });
  return { order, session };
}

/**
 * Mark the session's order Paid. Idempotent: an order that isn't Pending is left alone.
 * `userId`, when given, must own the order (the success page path).
 */
export async function markPaidFromSession(session, { source, userId = null } = {}) {
  if (!session || session.payment_status !== "paid") throw new ValidationError({}, "Session not found or payment not completed!");
  const orderId = Number(session.metadata?.orderId);
  if (!orderId) throw new ValidationError({}, "Order ID missing in Stripe session metadata!");

  return db.sequelize.transaction(async (transaction) => {
    const order = await db.Order.findByPk(orderId, { include: [{ model: db.OrderItem, as: "items" }], transaction, lock: transaction.LOCK.UPDATE });
    if (!order || (userId != null && String(order.userId) !== String(userId))) throw new ValidationError({}, `No pending order found for user with ID ${userId}.`);
    if (order.status !== "Pending" && order.status !== "Cancelled") return { order, changed: false };
    if (order.status === "Cancelled" && Number(order.paidAmount) > 0) return { order, changed: false };

    let note = source === "webhook" ? "Payment confirmed by Stripe" : "Payment confirmed";
    if (order.status === "Cancelled") {
      // Paid after the hold was released: take the stock again if it's still there.
      let short = false;
      for (const item of order.items) {
        if (!item.variationId) continue;
        try {
          const released = await db.StockMovement.findOne({ where: { orderItemId: item.id, reason: "hold_released" }, transaction });
          if (released) {
            await adjustStock({ variationId: item.variationId, delta: -item.quantity, reason: "count_correction", orderId: order.id, note: "Re-held: paid after checkout expired" }, { transaction });
          }
        } catch (error) {
          if (!(error instanceof InsufficientStockError)) throw error;
          short = true;
        }
      }
      note = short ? "Paid after checkout expired. Some items are out of stock: check before shipping." : "Paid after checkout expired";
    }

    const from = order.status;
    await order.update(
      {
        status: "Paid",
        paidAmount: money((session.amount_total ?? Math.round(Number(order.totalAmount) * 100)) / 100),
        paidAt: new Date(),
        stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? order.stripePaymentIntentId,
        stripeSessionId: order.stripeSessionId || session.id,
        version: order.version + 1,
      },
      { transaction }
    );
    await addOrderEvent(order.id, { type: "status", fromStatus: from, toStatus: "Paid", note }, { transaction });
    const variationIds = order.items.map((i) => i.variationId).filter(Boolean);
    if (variationIds.length) await db.Cart.destroy({ where: { accountId: order.userId, variationId: { [Op.in]: variationIds } }, transaction });
    return { order, changed: true };
  });
}

export async function markPaid(sessionId, opts) {
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  return markPaidFromSession(session, opts);
}

/** Cancel a Pending order and give its stock back. Returns true when it changed. */
export async function cancelPending(orderId, { note, actor = null, userId = null } = {}) {
  return db.sequelize.transaction(async (transaction) => {
    const order = await db.Order.findByPk(orderId, { include: [{ model: db.OrderItem, as: "items" }], transaction, lock: transaction.LOCK.UPDATE });
    if (!order || (userId != null && String(order.userId) !== String(userId))) return false;
    if (order.status !== "Pending") return false;
    await releaseHold(order, { transaction, actor });
    await order.update({ status: "Cancelled", version: order.version + 1 }, { transaction });
    await addOrderEvent(order.id, { type: "status", fromStatus: "Pending", toStatus: "Cancelled", note, actor }, { transaction });
    return true;
  });
}

/**
 * Pending orders older than the hold window: ask Stripe what happened, then either record
 * the payment or expire the session and give the stock back.
 */
export async function releaseExpiredHolds(now = new Date()) {
  const cutoff = new Date(now.getTime() - SWEEP_AFTER_MINUTES * 60000);
  const stale = await db.Order.findAll({ where: { status: "Pending", createdAt: { [Op.lt]: cutoff } }, attributes: ["id", "stripeSessionId"], limit: 100 });
  let released = 0;
  for (const o of stale) {
    try {
      if (o.stripeSessionId) {
        const stripe = getStripe();
        const session = await stripe.checkout.sessions.retrieve(o.stripeSessionId);
        if (session.payment_status === "paid") {
          await markPaidFromSession(session, { source: "webhook" });
          continue;
        }
        if (session.status === "open") await stripe.checkout.sessions.expire(o.stripeSessionId).catch(() => {});
      }
      if (await cancelPending(o.id, { note: "Checkout expired" })) released++;
    } catch (error) {
      console.error(`Could not release order ${o.id}:`, error?.message || error);
    }
  }
  return released;
}

/** Handle one verified Stripe webhook event. Duplicates are ignored. */
export async function handleStripeEvent(event) {
  if (await db.StripeEvent.findByPk(event.id)) return { duplicate: true };
  const session = event.data?.object;
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    if (session?.payment_status === "paid") await markPaidFromSession(session, { source: "webhook" });
  } else if (event.type === "checkout.session.expired") {
    const orderId = Number(session?.metadata?.orderId);
    if (orderId) await cancelPending(orderId, { note: "Checkout expired" });
  }
  await db.StripeEvent.findOrCreate({ where: { eventId: event.id }, defaults: { type: event.type } });
  return { duplicate: false };
}
