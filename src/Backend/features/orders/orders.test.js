import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("../../config/stripe.js", async () => (await import("../../test/fakeStripe.js")).stripeModule());
vi.mock("../../config/nodemailer.js", () => ({ transporter: { sendMail: vi.fn(async () => ({})) }, mailFrom: () => "shop@example.test" }));

const { fake, client } = await import("../../test/fakeStripe.js");
const { transporter } = await import("../../config/nodemailer.js");
const { default: routes } = await import("../../routes/routes.js");
const { db } = await import("../../database/index.js");
const { reconcilePendingRefunds } = await import("./service.js");
const { ADMIN, CUSTOMER, appAs, makeAccount, makeProduct, resetTables } = await import("../../test/helpers.js");
const { invalidateSite } = await import("../settings/service.js");

const admin = appAs(routes, ADMIN, "/api");
const stockOf = async (id) => (await db.Variations.findByPk(id)).stock;

/** A paid order #id for RM 778 (2 × RM 389), stock held and paid through the fake Stripe. */
async function paidOrder() {
  const { variations: [v] } = await makeProduct({ variations: [{ name: "Red", sku: "DMR-RED", price: 389, stock: 5 }] });
  const acct = await makeAccount({ email: `aiman.${Date.now()}${Math.floor(Math.random() * 1e6)}@example.test`, first_name: "Aiman" });
  const shopper = appAs(routes, { id: acct.id, category: "Customer" }, "/api");
  const res = await request(shopper).post("/api/cart/createOrder").send({ user_id: acct.id, items: [{ variation_id: v.id, quantity: 2 }], shipping_address: "KL", recipient_name: "Aiman", phoneNumber: "0123456789" });
  fake.pay(res.body.sessionId);
  await request(shopper).patch("/api/cart/markOrderPaidAndClearCart").send({ session_id: res.body.sessionId, user_id: acct.id });
  const order = await db.Order.findOne({ order: [["id", "DESC"]] });
  return { order, v, acct };
}
const detail = async (id) => (await request(admin).get(`/api/admin/orders/${id}`)).body;

describe("admin orders", () => {
  beforeEach(async () => {
    fake.reset();
    transporter.sendMail.mockClear();
    transporter.sendMail.mockImplementation(async () => ({}));
    invalidateSite();
    await resetTables("SiteSetting", "StripeEvent", "OrderEvent", "OrderRefund", "StockMovement", "AdminActivity", "OrderItem", "Order", "Cart", "Variations", "Products");
  });

  it("only offers moves that fit the status", async () => {
    const { order } = await paidOrder();
    const d = await detail(order.id);
    expect(d.actions).toEqual(["ship", "cancel", "refund"]);
    expect(d.order).toMatchObject({ status: "Paid", paidAmount: 778, paymentState: "paid", refundable: 778 });
    const bad = await request(admin).post(`/api/admin/orders/${order.id}/complete`).send({ version: d.order.version });
    expect(bad.status).toBe(409);
    expect(bad.body.message).toBe("Can't complete an order that is Paid.");
  });

  it("ships with tracking and emails the customer", async () => {
    const { order } = await paidOrder();
    const d = await detail(order.id);
    const res = await request(admin).post(`/api/admin/orders/${order.id}/ship`).send({ version: d.order.version, courier: "J&T", trackingNumber: "JT123456" });
    expect(res.status).toBe(200);
    expect(res.body.order).toMatchObject({ status: "Shipped", courier: "J&T", trackingNumber: "JT123456" });
    const mail = transporter.sendMail.mock.calls[0][0];
    expect(mail.to).toMatch(/^aiman\..*@example\.test$/);
    expect(mail.text).toContain("JT123456");
    expect(mail.subject).toBe(`Your order #${order.id} is on its way`);
    expect(res.body.events.map((e) => e.toStatus || e.note)).toEqual(expect.arrayContaining(["Shipped", "Order shipped email sent"]));
  });

  it("refuses a stale version", async () => {
    const { order } = await paidOrder();
    const d = await detail(order.id);
    await request(admin).post(`/api/admin/orders/${order.id}/notes`).send({ note: "Called the customer" });
    await request(admin).post(`/api/admin/orders/${order.id}/ship`).send({ version: d.order.version });
    const res = await request(admin).post(`/api/admin/orders/${order.id}/ship`).send({ version: d.order.version });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("version_conflict");
  });

  it("refunds part of an order through Stripe, once", async () => {
    const { order } = await paidOrder();
    const d = await detail(order.id);
    const res = await request(admin).post(`/api/admin/orders/${order.id}/refunds`).send({ amount: 100, reason: "Goodwill: scratched box", version: d.order.version });
    expect(res.status).toBe(201);
    expect(res.body.refund).toMatchObject({ amount: 100, status: "succeeded" });
    expect(res.body.order).toMatchObject({ paymentState: "partly_refunded", refundable: 678 });
    const [params, opts] = client.refunds.create.mock.calls[0];
    expect(params).toMatchObject({ payment_intent: order.stripePaymentIntentId || expect.any(String), amount: 10000 });
    expect(opts.idempotencyKey).toBe(`refund-${res.body.refund.id}`);
    expect(transporter.sendMail.mock.calls.at(-1)[0].subject).toBe(`Refund for order #${order.id}`);
  });

  it("can't refund more than what's left", async () => {
    const { order } = await paidOrder();
    await db.Order.update({ refundedAmount: 700 }, { where: { id: order.id } });
    const d = await detail(order.id);
    const res = await request(admin).post(`/api/admin/orders/${order.id}/refunds`).send({ amount: 100, reason: "x", version: d.order.version });
    expect(res.status).toBe(400);
    expect(res.body.errors.amount).toBe("Can't refund more than RM 78.00");
  });

  it("pauses refunds and cancels while one is pending, then settles it", async () => {
    const { order } = await paidOrder();
    fake.nextRefundStatus = "pending";
    let d = await detail(order.id);
    const first = await request(admin).post(`/api/admin/orders/${order.id}/refunds`).send({ amount: 100, reason: "a", version: d.order.version });
    expect(first.body.refund.status).toBe("pending");
    expect(first.body.actions).not.toContain("refund");
    expect(first.body.actions).not.toContain("cancel");
    const second = await request(admin).post(`/api/admin/orders/${order.id}/refunds`).send({ amount: 50, reason: "b", version: first.body.order.version });
    expect(second.status).toBe(409);
    expect(second.body.message).toBe("A refund is still waiting for Stripe to confirm.");
    for (const r of fake.refunds.values()) r.status = "succeeded";
    expect(await reconcilePendingRefunds()).toBe(1);
    d = await detail(order.id);
    expect(d.pendingRefund).toBe(false);
    expect(d.refunds[0].status).toBe("succeeded");
  });

  it("gives the money back when Stripe declines the refund", async () => {
    const { order } = await paidOrder();
    fake.failRefund = true;
    const d = await detail(order.id);
    const res = await request(admin).post(`/api/admin/orders/${order.id}/refunds`).send({ amount: 100, reason: "a", version: d.order.version });
    expect(res.body.refund.status).toBe("failed");
    expect(res.body.order.refundable).toBe(778);
  });

  it("cancels with a full refund and puts the stock back", async () => {
    const { order, v } = await paidOrder();
    expect(await stockOf(v.id)).toBe(3);
    const d = await detail(order.id);
    const res = await request(admin).post(`/api/admin/orders/${order.id}/cancel`).send({ version: d.order.version, reason: "Customer asked to cancel", refundAmount: 778, restock: true });
    expect(res.status).toBe(200);
    expect(res.body.order).toMatchObject({ status: "Cancelled", paymentState: "refunded" });
    expect(await stockOf(v.id)).toBe(5);
    expect(await db.StockMovement.count({ where: { reason: "cancel_restock" } })).toBe(1);
    const mail = transporter.sendMail.mock.calls.at(-1)[0];
    expect(mail.subject).toBe(`Order #${order.id} has been cancelled`);
    expect(mail.text).toContain("RM 778.00");
  });

  it("needs a reason to cancel", async () => {
    const { order } = await paidOrder();
    const d = await detail(order.id);
    const res = await request(admin).post(`/api/admin/orders/${order.id}/cancel`).send({ version: d.order.version, reason: " ", refundAmount: 0 });
    expect(res.status).toBe(400);
    expect(res.body.errors.reason).toBe("Give a reason");
  });

  it("still ships when the email fails, and says so", async () => {
    const { order } = await paidOrder();
    transporter.sendMail.mockRejectedValue(new Error("SMTP down"));
    const d = await detail(order.id);
    const res = await request(admin).post(`/api/admin/orders/${order.id}/ship`).send({ version: d.order.version });
    expect(res.body.order.status).toBe("Shipped");
    expect(res.body.events.some((e) => e.type === "email" && e.ok === false && e.note.startsWith("Email failed: Order shipped"))).toBe(true);
  });

  it("filters and searches", async () => {
    const { order } = await paidOrder();
    const by = async (query) => (await request(admin).get("/api/admin/orders").query(query)).body.items.map((o) => o.id);
    expect(await by({ status: "Paid" })).toEqual([order.id]);
    expect(await by({ status: "Shipped" })).toEqual([]);
    expect(await by({ q: "DMR-RED" })).toEqual([order.id]);
    expect(await by({ q: "aiman." })).toEqual([order.id]);
    expect(await by({ q: `#${order.id}` })).toEqual([order.id]);
    expect(await by({ payment: "paid" })).toEqual([order.id]);
    expect(await by({ payment: "refunded" })).toEqual([]);
  });

  it("keeps staff notes separate from the timeline", async () => {
    const { order } = await paidOrder();
    const res = await request(admin).post(`/api/admin/orders/${order.id}/notes`).send({ note: "Wants Tuesday delivery" });
    expect(res.status).toBe(201);
    const d = await detail(order.id);
    expect(d.notes[0]).toMatchObject({ note: "Wants Tuesday delivery", actorName: "Admin" });
    expect(d.events.some((e) => e.type === "note")).toBe(false);
  });

  it.each([["get", "/api/admin/orders"], ["get", "/api/admin/orders/1"], ["post", "/api/admin/orders/1/ship"], ["post", "/api/admin/orders/1/cancel"], ["post", "/api/admin/orders/1/refunds"], ["post", "/api/admin/orders/1/notes"]])(
    "%s %s is admin-only",
    async (m, p) => {
      expect((await request(appAs(routes, null, "/api"))[m](p)).status).toBe(401);
      expect((await request(appAs(routes, CUSTOMER, "/api"))[m](p)).status).toBe(403);
    }
  );
});
