// In-memory Stripe stand-in for tests. Use with:
//   vi.mock("../../config/stripe.js", async () => (await import("../../test/fakeStripe.js")).stripeModule());
import { vi } from "vitest";

export const fake = {
  sessions: new Map(),
  refunds: new Map(),
  nextRefundStatus: "succeeded",
  failRefund: false,
  // When true, the next refund is made but its reply is "lost" (a network error).
  loseNextRefundReply: false,
  reset() {
    this.sessions.clear();
    this.refunds.clear();
    this.nextRefundStatus = "succeeded";
    this.failRefund = false;
    this.loseNextRefundReply = false;
    for (const fn of Object.values(client.checkout.sessions)) fn.mockClear?.();
    client.refunds.create.mockClear();
  },
  pay(sessionId, amountSen) {
    const s = this.sessions.get(sessionId);
    Object.assign(s, { payment_status: "paid", status: "complete", payment_intent: `pi_${sessionId}`, amount_total: amountSen ?? s.amount_total });
    return s;
  },
};

let n = 0;
export const client = {
  checkout: {
    sessions: {
      create: vi.fn(async (params) => {
        const now = Math.floor(Date.now() / 1000);
        // Real Stripe: expires_at must be at least 30 minutes (and at most 24 hours) away.
        if (params.expires_at && (params.expires_at < now + 30 * 60 || params.expires_at > now + 24 * 3600)) throw Object.assign(new Error("expires_at must be between 30 minutes and 24 hours"), { type: "StripeInvalidRequestError" });
        const id = `cs_test_${++n}`;
        const amount_total = params.line_items.reduce((s, l) => s + l.price_data.unit_amount * l.quantity, 0);
        const s = { id, url: `https://checkout.stripe.test/${id}`, payment_status: "unpaid", status: "open", amount_total, metadata: params.metadata, expires_at: params.expires_at };
        fake.sessions.set(id, s);
        return s;
      }),
      retrieve: vi.fn(async (id) => {
        const s = fake.sessions.get(id);
        if (!s) throw new Error(`No such checkout.session: ${id}`);
        return { ...s };
      }),
      expire: vi.fn(async (id) => Object.assign(fake.sessions.get(id), { status: "expired" })),
    },
  },
  refunds: {
    create: vi.fn(async (params, opts) => {
      if (fake.failRefund) throw Object.assign(new Error("Your card was declined"), { type: "StripeCardError" });
      const key = opts?.idempotencyKey;
      if (key && fake.refunds.has(key)) {
        const prev = fake.refunds.get(key);
        // Real Stripe: reusing a key with different parameters is an error, not a replay.
        if (JSON.stringify(prev.params) !== JSON.stringify(params)) throw Object.assign(new Error("Keys for idempotent requests can only be used with the same parameters"), { type: "StripeIdempotencyError" });
        return prev;
      }
      const r = { id: `re_${fake.refunds.size + 1}`, amount: params.amount, payment_intent: params.payment_intent, metadata: params.metadata || {}, status: fake.nextRefundStatus, params };
      fake.refunds.set(key || r.id, r);
      if (fake.loseNextRefundReply) {
        fake.loseNextRefundReply = false;
        throw Object.assign(new Error("socket hang up"), { type: "StripeConnectionError" });
      }
      return r;
    }),
    retrieve: vi.fn(async (id) => [...fake.refunds.values()].find((r) => r.id === id)),
    list: vi.fn(async ({ payment_intent }) => ({ data: [...fake.refunds.values()].filter((r) => r.payment_intent === payment_intent) })),
  },
  webhooks: {
    constructEvent: (body, sig, secret) => {
      if (sig !== `valid:${secret}`) throw new Error("No signatures found matching the expected signature");
      return JSON.parse(Buffer.isBuffer(body) ? body.toString("utf8") : body);
    },
  },
};

export function stripeModule() {
  class PaymentsNotConfiguredError extends Error {}
  return { getStripe: () => client, PaymentsNotConfiguredError, STRIPE_API_VERSION: "test" };
}
