import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

vi.mock("../../config/stripe.js", async () => (await import("../../test/fakeStripe.js")).stripeModule());

const { fake, client } = await import("../../test/fakeStripe.js");
const { default: routes } = await import("../../routes/routes.js");
const { db } = await import("../../database/index.js");
const { releaseExpiredHolds, handleStripeEvent, markPaid } = await import("./payment.js");
const { stripeWebhook } = await import("./webhook.js");
const { appAs, makeAccount, makeProduct, resetTables } = await import("../../test/helpers.js");

const stockOf = async (id) => (await db.Variations.findByPk(id)).stock;
const body = (account, items) => ({ user_id: account.id, items, shipping_address: "KL", recipient_name: "Aiman", phoneNumber: "0123456789" });

describe("checkout holds and payment", () => {
  let red, blue, shopper, other;
  beforeEach(async () => {
    fake.reset();
    await resetTables("StripeEvent", "OrderEvent", "OrderRefund", "StockMovement", "OrderItem", "Order", "Cart", "Variations", "Products");
    ({ variations: [red, blue] } = await makeProduct({ variations: [{ name: "Red", sku: "DMR-RED", price: 389, stock: 1 }, { name: "Blue", sku: "DMR-BLUE", price: 389, stock: 5 }] }));
    shopper = await makeAccount();
    other = await makeAccount();
  });

  const as = (acct) => appAs(routes, { id: acct.id, category: "Customer" }, "/api");

  it("holds stock and opens a 30-minute Stripe session with server-side prices", async () => {
    const res = await request(as(shopper)).post("/api/cart/createOrder").send({ ...body(shopper, [{ variation_id: blue.id, quantity: 2 }]), total_amount: 1 });
    expect(res.status).toBe(200);
    expect(res.body.url).toMatch(/^https:\/\/checkout\.stripe\.test\//);
    expect(await stockOf(blue.id)).toBe(3);
    const order = await db.Order.findOne();
    expect(Number(order.totalAmount)).toBe(778);
    expect(order.stripeSessionId).toBe(res.body.sessionId);
    const params = client.checkout.sessions.create.mock.calls[0][0];
    expect(params.expires_at - Math.floor(Date.now() / 1000)).toBeGreaterThan(29 * 60);
    expect(params.line_items[0].price_data.product_data.name).toBe("DMR Vault (Blue)");
  });

  it("sells the last unit once when two shoppers check out together", async () => {
    await db.Cart.create({ accountId: other.id, variationId: red.id, quantity: 1 });
    const [a, b] = await Promise.all([
      request(as(shopper)).post("/api/cart/createOrder").send(body(shopper, [{ variation_id: red.id, quantity: 1 }])),
      request(as(other)).post("/api/cart/createOrder").send(body(other, [{ variation_id: red.id, quantity: 1 }])),
    ]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([200, 409]);
    const loser = a.status === 409 ? a : b;
    expect(loser.body.message).toBe("Only 0 of DMR Vault (Red) left. We've updated your cart.");
    expect(await stockOf(red.id)).toBe(0);
  });

  it("holds nothing when any line is short", async () => {
    const res = await request(as(shopper)).post("/api/cart/createOrder").send(body(shopper, [{ variation_id: blue.id, quantity: 2 }, { variation_id: red.id, quantity: 3 }]));
    expect(res.status).toBe(409);
    expect(await stockOf(blue.id)).toBe(5);
    expect(await db.Order.count()).toBe(0);
  });

  it("refuses draft products", async () => {
    await db.Products.update({ status: "draft" }, { where: {} });
    const res = await request(as(shopper)).post("/api/cart/createOrder").send(body(shopper, [{ variation_id: blue.id, quantity: 1 }]));
    expect(res.status).toBe(400);
  });

  it("releases an abandoned checkout after 35 minutes, not before", async () => {
    await request(as(shopper)).post("/api/cart/createOrder").send(body(shopper, [{ variation_id: blue.id, quantity: 2 }]));
    expect(await releaseExpiredHolds(new Date(Date.now() + 20 * 60000))).toBe(0);
    expect(await stockOf(blue.id)).toBe(3);
    expect(await releaseExpiredHolds(new Date(Date.now() + 36 * 60000))).toBe(1);
    expect(await stockOf(blue.id)).toBe(5);
    expect((await db.Order.findOne()).status).toBe("Cancelled");
    expect(await db.StockMovement.count({ where: { reason: "hold_released" } })).toBe(1);
    expect(client.checkout.sessions.expire).toHaveBeenCalled();
  });

  it("records a payment the sweep finds instead of cancelling it", async () => {
    const res = await request(as(shopper)).post("/api/cart/createOrder").send(body(shopper, [{ variation_id: blue.id, quantity: 1 }]));
    fake.pay(res.body.sessionId);
    await releaseExpiredHolds(new Date(Date.now() + 36 * 60000));
    expect((await db.Order.findOne()).status).toBe("Paid");
    expect(await stockOf(blue.id)).toBe(4);
  });

  it("confirms once when the success page and the webhook both arrive", async () => {
    await db.Cart.create({ accountId: shopper.id, variationId: blue.id, quantity: 1 });
    const res = await request(as(shopper)).post("/api/cart/createOrder").send(body(shopper, [{ variation_id: blue.id, quantity: 1 }]));
    const session = fake.pay(res.body.sessionId);
    await Promise.all([
      request(as(shopper)).patch("/api/cart/markOrderPaidAndClearCart").send({ session_id: session.id, user_id: shopper.id }),
      handleStripeEvent({ id: "evt_1", type: "checkout.session.completed", data: { object: { ...session } } }),
    ]);
    const order = await db.Order.findOne();
    expect(order.status).toBe("Paid");
    expect(Number(order.paidAmount)).toBe(389);
    expect(order.stripePaymentIntentId).toBe(`pi_${session.id}`);
    expect(await db.OrderEvent.count({ where: { toStatus: "Paid" } })).toBe(1);
    expect(await stockOf(blue.id)).toBe(4);
    expect(await db.Cart.count({ where: { accountId: shopper.id } })).toBe(0);
  });

  it("won't confirm someone else's order", async () => {
    const res = await request(as(shopper)).post("/api/cart/createOrder").send(body(shopper, [{ variation_id: blue.id, quantity: 1 }]));
    fake.pay(res.body.sessionId);
    await expect(markPaid(res.body.sessionId, { source: "redirect", userId: other.id })).rejects.toThrow();
  });

  it("processes a webhook event once", async () => {
    const res = await request(as(shopper)).post("/api/cart/createOrder").send(body(shopper, [{ variation_id: blue.id, quantity: 1 }]));
    const event = { id: "evt_dup", type: "checkout.session.expired", data: { object: fake.sessions.get(res.body.sessionId) } };
    expect((await handleStripeEvent(event)).duplicate).toBe(false);
    expect((await handleStripeEvent(event)).duplicate).toBe(true);
    expect(await stockOf(blue.id)).toBe(5);
  });

  it("customer cancel gives the stock back and keeps the order", async () => {
    const res = await request(as(shopper)).post("/api/cart/createOrder").send(body(shopper, [{ variation_id: blue.id, quantity: 2 }]));
    const c = await request(as(shopper)).delete("/api/cart/cancelOrder").send({ session_id: res.body.sessionId, user_id: shopper.id });
    expect(c.status).toBe(200);
    expect(await stockOf(blue.id)).toBe(5);
    expect((await db.Order.findOne()).status).toBe("Cancelled");
  });

  describe("webhook endpoint", () => {
    const app = express();
    app.post("/hook", express.raw({ type: "application/json" }), stripeWebhook);
    it("rejects a bad signature", async () => {
      process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
      const res = await request(app).post("/hook").set("Content-Type", "application/json").set("stripe-signature", "nope").send(JSON.stringify({ id: "evt" }));
      expect(res.status).toBe(400);
    });
    it("accepts a signed event", async () => {
      process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
      const res = await request(app).post("/hook").set("Content-Type", "application/json").set("stripe-signature", "valid:whsec_test").send(JSON.stringify({ id: "evt_ok", type: "ping", data: { object: {} } }));
      expect(res.status).toBe(200);
    });
    it("answers 503 without a secret", async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;
      expect((await request(app).post("/hook").send("{}")).status).toBe(503);
    });
  });
});
