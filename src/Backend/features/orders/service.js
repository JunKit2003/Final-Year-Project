// Admin order management, modelled on the pet-hotel booking admin: fulfilment status and
// money are separate, every action needs the order's version, and everything lands on the
// order's timeline.
import { Op, literal } from "sequelize";
import { db } from "../../database/index.js";
import { getStripe } from "../../config/stripe.js";
import { logActivity } from "../activity/service.js";
import { sendTemplated, EMAIL_LABELS } from "../email/send.js";
import { ConflictError, NotFoundError, ValidationError, VersionConflictError } from "../http.js";
import { addOrderEvent, releaseHold, returnHeldStock } from "./payment.js";

const ORDER_CONFLICT = "Someone else changed this order since you opened it. Reload to see their changes.";
export const TRANSITIONS = { ship: ["Paid"], complete: ["Shipped"], reopen: ["Completed"], cancel: ["Pending", "Paid", "Shipped"] };
const VERB = { ship: "ship", complete: "complete", reopen: "reopen", cancel: "cancel" };
const TO = { ship: "Shipped", complete: "Completed", reopen: "Shipped", cancel: "Cancelled" };

const n = (v) => Math.round(Number(v || 0) * 100) / 100;
const rm = (v) => `RM ${n(v).toFixed(2)}`;
export const refundable = (o) => n(Math.max(0, n(o.paidAmount) - n(o.refundedAmount)));

export function paymentState(o) {
  const paid = n(o.paidAmount);
  const refunded = n(o.refundedAmount);
  if (paid <= 0) return "unpaid";
  if (refunded <= 0) return "paid";
  if (refunded >= paid) return "refunded";
  return "partly_refunded";
}

export function actionsFor(o, { pendingRefund = false } = {}) {
  const out = [];
  for (const [a, from] of Object.entries(TRANSITIONS)) if (from.includes(o.status) && !(a === "cancel" && pendingRefund)) out.push(a);
  if (refundable(o) > 0 && o.stripePaymentIntentId && !pendingRefund) out.push("refund");
  return out;
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------
const customerOf = (a) => (a ? { id: a.id, name: `${a.first_name} ${a.last_name}`.trim(), username: a.username, email: a.email, phone: a.phone_number } : null);

export async function listOrders({ status, payment, from, to, q, limit, offset }) {
  const where = {};
  const and = [];
  if (["Pending", "Paid", "Shipped", "Completed", "Cancelled"].includes(status)) where.status = status;
  if (payment === "unpaid") where.paidAmount = 0;
  if (payment === "paid") and.push(literal("`Order`.`paidAmount` > 0 AND `Order`.`refundedAmount` = 0"));
  if (payment === "partly_refunded") and.push(literal("`Order`.`refundedAmount` > 0 AND `Order`.`refundedAmount` < `Order`.`paidAmount`"));
  if (payment === "refunded") and.push(literal("`Order`.`paidAmount` > 0 AND `Order`.`refundedAmount` >= `Order`.`paidAmount`"));
  if (payment === "pending_refund") and.push(literal("EXISTS (SELECT 1 FROM order_refunds r WHERE r.orderId = `Order`.`id` AND r.status = 'pending')"));
  if (from) and.push({ createdAt: { [Op.gte]: new Date(`${from}T00:00:00+08:00`) } });
  if (to) and.push({ createdAt: { [Op.lt]: new Date(new Date(`${to}T00:00:00+08:00`).getTime() + 86400000) } });
  const needle = String(q || "").trim().replace(/^#/, "");
  if (needle) {
    const like = `%${needle}%`;
    const esc = db.sequelize.escape(like);
    and.push({
      [Op.or]: [
        ...(/^\d+$/.test(needle) ? [{ id: Number(needle) }] : []),
        { recipientName: { [Op.like]: like } },
        { phoneNumber: { [Op.like]: like } },
        literal(`EXISTS (SELECT 1 FROM account a WHERE a.id = \`Order\`.\`userId\` AND (a.email LIKE ${esc} OR a.username LIKE ${esc}))`),
        literal(`EXISTS (SELECT 1 FROM order_items i WHERE i.orderId = \`Order\`.\`id\` AND i.sku LIKE ${esc})`),
      ],
    });
  }
  if (and.length) where[Op.and] = and;
  const { rows, count } = await db.Order.findAndCountAll({
    where,
    include: [
      { model: db.Account, as: "user", attributes: ["id", "first_name", "last_name", "username", "email", "phone_number"] },
      { model: db.OrderItem, as: "items", attributes: ["quantity"] },
    ],
    order: [["createdAt", "DESC"], ["id", "DESC"]],
    limit,
    offset,
    distinct: true,
  });
  return {
    total: count,
    items: rows.map((o) => ({
      id: o.id,
      createdAt: o.createdAt,
      status: o.status,
      paymentState: paymentState(o),
      totalAmount: n(o.totalAmount),
      recipientName: o.recipientName,
      customer: customerOf(o.user),
      itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
    })),
  };
}

export async function getOrderDetail(id) {
  await reconcilePendingRefunds({ orderId: id });
  const o = await db.Order.findByPk(id, {
    include: [
      { model: db.Account, as: "user" },
      { model: db.OrderItem, as: "items", include: [{ model: db.Variations, as: "variation", attributes: ["id", "productId"] }] },
      { model: db.OrderRefund, as: "refunds" },
      { model: db.OrderEvent, as: "events" },
    ],
    order: [[{ model: db.OrderEvent, as: "events" }, "createdAt", "ASC"], [{ model: db.OrderEvent, as: "events" }, "id", "ASC"], [{ model: db.OrderRefund, as: "refunds" }, "id", "ASC"]],
  });
  if (!o) throw new NotFoundError("Order not found.");
  const pendingRefund = o.refunds.some((r) => r.status === "pending");
  return {
    order: {
      id: o.id,
      status: o.status,
      createdAt: o.createdAt,
      paidAt: o.paidAt,
      totalAmount: n(o.totalAmount),
      paidAmount: n(o.paidAmount),
      refundedAmount: n(o.refundedAmount),
      refundable: refundable(o),
      paymentState: paymentState(o),
      recipientName: o.recipientName,
      shippingAddress: o.shippingAddress,
      phoneNumber: o.phoneNumber,
      courier: o.courier,
      trackingNumber: o.trackingNumber,
      version: o.version,
      canRefundOnline: !!o.stripePaymentIntentId,
    },
    items: o.items.map((i) => ({
      id: i.id,
      productName: i.productName,
      variationName: i.variationName,
      sku: i.sku,
      quantity: i.quantity,
      price: n(i.price),
      lineTotal: n(n(i.price) * i.quantity),
      variationId: i.variationId,
      productId: i.variation?.productId ?? null,
    })),
    customer: customerOf(o.user),
    refunds: o.refunds.map((r) => ({ id: r.id, amount: n(r.amount), reason: r.reason, status: r.status, error: r.error, actorName: r.actorName, createdAt: r.createdAt })),
    events: o.events.filter((e) => e.type !== "note").map(eventJSON),
    notes: o.events.filter((e) => e.type === "note").map(eventJSON).reverse(),
    pendingRefund,
    actions: actionsFor(o, { pendingRefund }),
  };
}

const eventJSON = (e) => ({ id: e.id, type: e.type, fromStatus: e.fromStatus, toStatus: e.toStatus, note: e.note, ok: e.ok, actorName: e.actorName, createdAt: e.createdAt });

// ---------------------------------------------------------------------------
// Emails
// ---------------------------------------------------------------------------
async function notify(orderId, templateKey, vars) {
  const o = await db.Order.findByPk(orderId, { include: [{ model: db.Account, as: "user" }] });
  const name = o.recipientName || o.user?.first_name || o.user?.username;
  const r = await sendTemplated(templateKey, o.user?.email, { name, orderId: o.id, ...vars });
  await addOrderEvent(orderId, { type: "email", ok: r.ok, note: r.ok ? `${EMAIL_LABELS[templateKey]} email sent` : `Email failed: ${EMAIL_LABELS[templateKey]}${r.error ? ` (${r.error})` : ""}` });
  return r;
}

// ---------------------------------------------------------------------------
// Status moves
// ---------------------------------------------------------------------------
async function lockForAction(transaction, id, action, version) {
  const o = await db.Order.findByPk(id, { include: [{ model: db.OrderItem, as: "items" }], transaction, lock: transaction.LOCK.UPDATE });
  if (!o) throw new NotFoundError("Order not found.");
  if (Number(version) !== o.version) throw new VersionConflictError(ORDER_CONFLICT);
  if (action && !TRANSITIONS[action].includes(o.status)) throw new ConflictError(`Can't ${VERB[action]} an order that is ${o.status}.`, { code: "bad_transition" });
  return o;
}

export async function moveOrder(id, action, { version, courier, trackingNumber }, actor) {
  if (!["ship", "complete", "reopen"].includes(action)) throw new NotFoundError();
  const extra = {};
  if (action === "ship") {
    const c = String(courier || "").trim();
    const t = String(trackingNumber || "").trim();
    if (c.length > 60) throw new ValidationError({ courier: "Keep it under 60 characters" });
    if (t.length > 80) throw new ValidationError({ trackingNumber: "Keep it under 80 characters" });
    Object.assign(extra, { courier: c || null, trackingNumber: t || null });
  }
  const from = await db.sequelize.transaction(async (transaction) => {
    const o = await lockForAction(transaction, id, action, version);
    const prev = o.status;
    await o.update({ status: TO[action], version: o.version + 1, ...extra }, { transaction });
    const note = action === "ship" && (extra.courier || extra.trackingNumber) ? [extra.courier, extra.trackingNumber].filter(Boolean).join(" · ") : action === "reopen" ? "Reopened" : null;
    await addOrderEvent(id, { type: "status", fromStatus: prev, toStatus: TO[action], note, actor }, { transaction });
    return prev;
  });
  await logActivity({ actor, action: `order.${action}`, entity: "order", entityId: id, summary: `${{ ship: "Shipped", complete: "Completed", reopen: "Reopened" }[action]} order #${id}` });
  if (action === "ship") await notify(id, "orderShipped", { courier: extra.courier || "Our courier", trackingNumber: extra.trackingNumber || "We'll send it soon" });
  return { from };
}

export async function cancelOrder(id, { version, reason, refundAmount = 0, restock = true }, actor) {
  const why = String(reason || "").trim();
  if (!why) throw new ValidationError({ reason: "Give a reason" });
  if (why.length > 300) throw new ValidationError({ reason: "Keep it under 300 characters" });
  const amount = n(refundAmount);
  if (!(amount >= 0)) throw new ValidationError({ refundAmount: "Enter an amount" });

  let sessionToExpire = null;
  const before = await db.sequelize.transaction(async (transaction) => {
    const o = await lockForAction(transaction, id, "cancel", version);
    if (await db.OrderRefund.findOne({ where: { orderId: id, status: "pending" }, transaction })) throw new ConflictError("A refund is still waiting for Stripe to confirm.", { code: "refund_pending" });
    if (amount > refundable(o)) throw new ValidationError({ refundAmount: `Refund must be between RM 0.00 and ${rm(refundable(o))}` });
    if (amount > 0 && !o.stripePaymentIntentId) throw new ValidationError({ refundAmount: "Refund this order in the Stripe dashboard." });
    const prev = o.status;
    if (prev === "Pending") {
      await releaseHold(o, { transaction, actor });
      sessionToExpire = o.stripeSessionId;
    } else if (restock) {
      // Only what each line actually holds goes back (a late payment may not have got stock).
      await returnHeldStock(o, { transaction, actor, reason: "cancel_restock" });
    }
    await o.update({ status: "Cancelled", version: o.version + 1 }, { transaction });
    await addOrderEvent(id, { type: "status", fromStatus: prev, toStatus: "Cancelled", note: why, actor }, { transaction });
    return { prev };
  });
  if (sessionToExpire) await getStripe().checkout.sessions.expire(sessionToExpire).catch(() => {});
  await logActivity({ actor, action: "order.cancel", entity: "order", entityId: id, summary: `Cancelled order #${id}: ${why}` });
  let refund = null;
  if (amount > 0) refund = await requestRefund(id, { amount, reason: why, actor, checkVersion: false, emailOnSuccess: false });
  if (before.prev !== "Pending") {
    // Only promise money that has actually gone back (or is on its way).
    const told = !refund ? "RM 0.00" : refund.status === "succeeded" ? rm(amount) : refund.status === "pending" ? `${rm(amount)} (being processed)` : "RM 0.00 (we'll be in touch about your refund)";
    await notify(id, "orderCancelled", { amount: told });
  }
  return { refund };
}

export async function addNote(id, note, actor) {
  const text = String(note || "").trim();
  if (!text) throw new ValidationError({ note: "Write a note" });
  if (text.length > 1000) throw new ValidationError({ note: "Keep it under 1000 characters" });
  if (!(await db.Order.findByPk(id, { attributes: ["id"] }))) throw new NotFoundError("Order not found.");
  const e = await addOrderEvent(id, { type: "note", note: text, actor });
  return eventJSON(e);
}

// ---------------------------------------------------------------------------
// Refunds
// ---------------------------------------------------------------------------
const OUTCOME = { succeeded: "succeeded", pending: "pending", requires_action: "pending", failed: "failed", canceled: "failed" };

/** Record what Stripe said about a refund. */
async function applyRefundOutcome(refundId, status, { stripeRefundId = null, error = null } = {}) {
  return db.sequelize.transaction(async (transaction) => {
    const r = await db.OrderRefund.findByPk(refundId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!r || r.status !== "pending") return r;
    if (stripeRefundId && !r.stripeRefundId) r.stripeRefundId = stripeRefundId;
    if (status === "pending") {
      await r.save({ transaction });
      return r;
    }
    const o = await db.Order.findByPk(r.orderId, { transaction, lock: transaction.LOCK.UPDATE });
    if (status === "failed") {
      await o.update({ refundedAmount: n(n(o.refundedAmount) - n(r.amount)), version: o.version + 1 }, { transaction });
      await addOrderEvent(o.id, { type: "refund", ok: false, note: `Refund of ${rm(r.amount)} failed${error ? `: ${error}` : ""}` }, { transaction });
    } else {
      await addOrderEvent(o.id, { type: "refund", note: `Refunded ${rm(r.amount)}: ${r.reason}`, actorId: r.actorId, actorName: r.actorName }, { transaction });
    }
    await r.update({ status, error: error ? String(error).slice(0, 300) : null }, { transaction });
    return r;
  });
}

/** Errors that mean Stripe definitely didn't refund (as opposed to a lost response). */
const definitive = (e) => ["StripeCardError", "StripeInvalidRequestError", "StripePermissionError"].includes(e?.type);

/**
 * The exact refund request for a refund row. The first attempt and every retry must send
 * identical parameters with the same idempotency key, or Stripe rejects the retry.
 */
export const refundRequest = (orderId, refundId, intent, amount) => [
  { payment_intent: intent, amount: Math.round(n(amount) * 100), metadata: { orderId: String(orderId), refundId: String(refundId) } },
  { idempotencyKey: `refund-${refundId}` },
];

/** A refund Stripe already made for this row (found by our metadata), if any. */
async function findStripeRefund(stripe, intent, refundId) {
  if (!stripe.refunds.list) return null;
  const list = await stripe.refunds.list({ payment_intent: intent, limit: 100 });
  return (list?.data || []).find((x) => x.metadata?.refundId === String(refundId)) || null;
}

export async function requestRefund(id, { amount, reason, version, actor, checkVersion = true, emailOnSuccess = true }) {
  const amt = n(amount);
  const why = String(reason || "").trim();
  if (!(amt > 0)) throw new ValidationError({ amount: "Enter an amount above RM 0.00" });
  if (!why) throw new ValidationError({ reason: "Give a reason" });
  if (why.length > 300) throw new ValidationError({ reason: "Keep it under 300 characters" });

  const { refund, intent } = await db.sequelize.transaction(async (transaction) => {
    const o = await db.Order.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!o) throw new NotFoundError("Order not found.");
    if (checkVersion && Number(version) !== o.version) throw new VersionConflictError(ORDER_CONFLICT);
    if (!o.stripePaymentIntentId) throw new ConflictError("Refund this order in the Stripe dashboard.", { code: "no_payment_intent" });
    if (await db.OrderRefund.findOne({ where: { orderId: id, status: "pending" }, transaction })) throw new ConflictError("A refund is still waiting for Stripe to confirm.", { code: "refund_pending" });
    if (amt > refundable(o)) throw new ValidationError({ amount: `Can't refund more than ${rm(refundable(o))}` }, `Can't refund more than ${rm(refundable(o))}`);
    const r = await db.OrderRefund.create({ orderId: id, amount: amt, reason: why, status: "pending", actorId: actor?.id ?? null, actorName: actor?.username ?? null }, { transaction });
    // Pending refunds count as refunded, so the same money can't be refunded twice.
    await o.update({ refundedAmount: n(n(o.refundedAmount) + amt), version: o.version + 1 }, { transaction });
    return { refund: r, intent: o.stripePaymentIntentId };
  });

  // Outside the transaction: the row id is the idempotency key, so a retry is safe.
  let outcome;
  try {
    const s = await getStripe().refunds.create(...refundRequest(id, refund.id, intent, amt));
    outcome = await applyRefundOutcome(refund.id, OUTCOME[s.status] || "pending", { stripeRefundId: s.id });
  } catch (error) {
    outcome = definitive(error) ? await applyRefundOutcome(refund.id, "failed", { error: error.message }) : await refund.reload();
    if (!definitive(error)) console.error(`Refund ${refund.id} sent but no answer from Stripe; will re-check:`, error?.message);
  }
  await logActivity({ actor, action: "order.refund", entity: "order", entityId: id, summary: `Refund of ${rm(amt)} on order #${id} (${outcome.status}): ${why}` });
  if (outcome.status === "succeeded" && emailOnSuccess) await notify(id, "orderRefunded", { amount: rm(amt) });
  return { id: outcome.id, amount: amt, status: outcome.status, error: outcome.error };
}

/** Ask Stripe about refunds still pending (on order open, and from the sweeper). */
export async function reconcilePendingRefunds({ orderId } = {}) {
  const pending = await db.OrderRefund.findAll({ where: { status: "pending", ...(orderId ? { orderId } : {}) }, limit: 50 });
  if (!pending.length) return 0;
  let stripe;
  try {
    stripe = getStripe();
  } catch {
    return 0;
  }
  let settled = 0;
  for (const r of pending) {
    try {
      let s;
      if (r.stripeRefundId) s = await stripe.refunds.retrieve(r.stripeRefundId);
      else {
        // The first reply was lost. Look for the refund Stripe may already have made, and
        // only then retry with exactly the same request (same key, same parameters).
        const o = await db.Order.findByPk(r.orderId, { attributes: ["stripePaymentIntentId"] });
        s = (await findStripeRefund(stripe, o.stripePaymentIntentId, r.id)) || (await stripe.refunds.create(...refundRequest(r.orderId, r.id, o.stripePaymentIntentId, r.amount)));
      }
      const status = OUTCOME[s?.status] || "pending";
      await applyRefundOutcome(r.id, status, { stripeRefundId: s?.id });
      if (status !== "pending") settled++;
      if (status === "succeeded") await notify(r.orderId, "orderRefunded", { amount: rm(r.amount) });
    } catch (error) {
      if (definitive(error)) {
        await applyRefundOutcome(r.id, "failed", { error: error.message });
        settled++;
      }
    }
  }
  return settled;
}
