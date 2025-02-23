// tests/cancelOrder.test.js
import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";

// ───────────────────────────────────────────────
// 1️⃣ Declare the retrieveMock using var so it's hoisted
// ───────────────────────────────────────────────
var retrieveMock = vi.fn();

// ───────────────────────────────────────────────
// 2️⃣ Mock the Stripe module
// ───────────────────────────────────────────────
// When your controller does "new Stripe(process.env.STRIPE_SECRET_KEY)",
// our mock returns an instance whose "checkout.sessions.retrieve" method is set to retrieveMock.
vi.mock("stripe", () => {
  return {
    default: class {
      constructor(secret) {
        // Optionally, you can verify secret here.
        this.checkout = {
          sessions: {
            retrieve: retrieveMock,
          },
        };
      }
    },
  };
});

// ───────────────────────────────────────────────
// 3️⃣ Mock the database utilities with custom error classes
// ───────────────────────────────────────────────
vi.mock("../../../database/utils.js", () => ({
  pingDatabase: vi.fn(),
  InputValidationError: class InputValidationError extends Error {
    constructor(message) {
      super(message);
      this.name = "InputValidationError";
    }
  },
  DatabaseConnectionError: class DatabaseConnectionError extends Error {
    constructor(message) {
      super(message);
      this.name = "DatabaseConnectionError";
    }
  },
  DatabaseError: class DatabaseError extends Error {
    constructor(message) {
      super(message);
      this.name = "DatabaseError";
    }
  },
}));

// ───────────────────────────────────────────────
// 4️⃣ Mock the database module (simulate transaction & order lookup)
// ───────────────────────────────────────────────
const fakeTransaction = { commit: vi.fn(), rollback: vi.fn() };
const fakeOrder = { destroy: vi.fn() };

vi.mock("../../../database/index.js", () => ({
  db: {
    sequelize: {
      transaction: async () => fakeTransaction,
    },
    Order: {
      findOne: vi.fn(), // We'll override this in individual tests.
    },
  },
}));

// ───────────────────────────────────────────────
// 5️⃣ Import modules AFTER mocks are set up
// ───────────────────────────────────────────────
import * as dbUtils from "../../../database/utils.js"; // so we can use dbUtils.pingDatabase
import { db } from "../../../database/index.js";
import cancelOrder from "../../cart/cancelOrder.js";
import Stripe from "stripe";

// ───────────────────────────────────────────────
// 6️⃣ Set up Express app & route for testing
// ───────────────────────────────────────────────
const app = express();
app.use(express.json());
// Your API route is registered as DELETE /cart/cancelOrder
app.delete("/cart/cancelOrder", (req, res) => cancelOrder(req, res));

// ───────────────────────────────────────────────
// 7️⃣ Write the tests
// ───────────────────────────────────────────────
describe("DELETE /cart/cancelOrder API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 if session_id is missing", async () => {
    const res = await request(app)
      .delete("/cart/cancelOrder")
      .send({ user_id: "user_123" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Missing 'session_id' in the request body!");
  });

  it("should return 400 if user_id is missing", async () => {
    const res = await request(app)
      .delete("/cart/cancelOrder")
      .send({ session_id: "sess_123" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Missing 'user_id' in the request body!");
  });

  it("should return 400 if the Stripe session payment_status is 'paid'", async () => {
    // Arrange: simulate a Stripe session with payment_status "paid"
    const stripeSession = {
      payment_status: "paid",
      metadata: { orderId: "order_123" },
    };
    retrieveMock.mockResolvedValue(stripeSession);
    dbUtils.pingDatabase.mockResolvedValue();

    const res = await request(app)
      .delete("/cart/cancelOrder")
      .send({ session_id: "sess_123", user_id: "user_123" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("This order has already been paid, cannot delete!");
  });

  it("should return 400 if Order ID is missing in Stripe session metadata", async () => {
    // Arrange: simulate a Stripe session with no orderId in metadata.
    const stripeSession = {
      payment_status: "unpaid",
      metadata: {},
    };
    retrieveMock.mockResolvedValue(stripeSession);
    dbUtils.pingDatabase.mockResolvedValue();

    const res = await request(app)
      .delete("/cart/cancelOrder")
      .send({ session_id: "sess_123", user_id: "user_123" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Order ID missing in Stripe session metadata!");
  });

  it("should return 400 if no pending order is found", async () => {
    // Arrange: valid Stripe session with an orderId.
    const stripeSession = {
      payment_status: "unpaid",
      metadata: { orderId: "order_123" },
    };
    retrieveMock.mockResolvedValue(stripeSession);
    dbUtils.pingDatabase.mockResolvedValue();

    // Simulate no pending order found.
    db.Order.findOne = vi.fn().mockResolvedValue(null);

    const res = await request(app)
      .delete("/cart/cancelOrder")
      .send({ session_id: "sess_123", user_id: "user_123" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(
      "No 'Pending' order found for user user_123 with orderId order_123."
    );
  });

  it("should return 200 if order is canceled successfully", async () => {
    // Arrange: valid Stripe session with an orderId.
    const stripeSession = {
      payment_status: "unpaid",
      metadata: { orderId: "order_123" },
    };
    retrieveMock.mockResolvedValue(stripeSession);
    dbUtils.pingDatabase.mockResolvedValue();

    // Simulate a pending order found.
    db.Order.findOne = vi.fn().mockResolvedValue(fakeOrder);
    fakeOrder.destroy.mockResolvedValue();

    const res = await request(app)
      .delete("/cart/cancelOrder")
      .send({ session_id: "sess_123", user_id: "user_123" });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Order canceled/deleted successfully.");
    // Verify that destroy was called with the transaction and that the transaction was committed.
    expect(fakeOrder.destroy).toHaveBeenCalledWith({ transaction: fakeTransaction });
    expect(fakeTransaction.commit).toHaveBeenCalled();
  });
});
