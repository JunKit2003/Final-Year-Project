// tests/markOrderPaidAndClearCart.test.js
import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { Op } from "sequelize";

// 1️⃣ Mock Stripe BEFORE importing the module
vi.mock("stripe", () => {
  // We'll return a mock Stripe constructor that yields an object
  // with a 'checkout.sessions.retrieve' spy.
  const mockStripeInstance = {
    checkout: {
      sessions: {
        retrieve: vi.fn(),
      },
    },
  };
  return {
    default: vi.fn(() => mockStripeInstance),
  };
});

// 2️⃣ Mock database utils BEFORE importing the module
vi.mock("../../../database/utils.js", () => ({
  pingDatabase: vi.fn(),
  DatabaseConnectionError: class DatabaseConnectionError extends Error {},
  InputValidationError: class InputValidationError extends Error {},
  DatabaseError: class DatabaseError extends Error {},
}));

// 3️⃣ Mock database index
vi.mock("../../../database/index.js", () => {
  // We need the transaction object to have commit & rollback
  const commit = vi.fn();
  const rollback = vi.fn();
  const transaction = { commit, rollback, LOCK: { UPDATE: "UPDATE" } };

  // Return a mock of your db object
  return {
    db: {
      sequelize: {
        transaction: vi.fn(() => transaction),
      },
      Order: {
        findOne: vi.fn(),
      },
      OrderItem: {},
      Variations: {
        findOne: vi.fn(),
      },
      Cart: {
        destroy: vi.fn(),
      },
    },
  };
});

// 4️⃣ Now import the actual modules (AFTER mocks!)
import markOrderPaidAndClearCart from "../../cart/markOrderPaidAndClearCart.js";
import { db } from "../../../database/index.js";
import {
  pingDatabase,
  InputValidationError,
} from "../../../database/utils.js";
import Stripe from "stripe"; // Our mocked Stripe

// Make references to easier mock usage
const mockStripe = Stripe(); // This should yield the mockStripeInstance
const { findOne: mockFindOrder } = db.Order;
const { findOne: mockFindVariation } = db.Variations;
const { destroy: mockCartDestroy } = db.Cart;
const { transaction: mockTransaction } = db.sequelize;

// 5️⃣ Create an Express test app
const app = express();
app.use(express.json());
app.post("/api/cart/markOrderPaidAndClearCart", (req, res) =>
  markOrderPaidAndClearCart(req, res)
);

// 6️⃣ (Optional) any DB setup or teardown if needed
beforeAll(async () => {
  // E.g., db.sequelize.authenticate() if you have a real DB
});
afterAll(async () => {
  // db.sequelize.close() if needed
});

// 7️⃣ Start writing tests
describe("POST /api/cart/markOrderPaidAndClearCart", () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  it("should return 400 if 'session_id' is missing", async () => {
    pingDatabase.mockResolvedValue();
    const response = await request(app)
      .post("/api/cart/markOrderPaidAndClearCart")
      .send({ user_id: 123 }); // Missing session_id

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/Missing 'session_id'/i);
  });

  it("should return 400 if 'user_id' is missing", async () => {
    pingDatabase.mockResolvedValue();
    const response = await request(app)
      .post("/api/cart/markOrderPaidAndClearCart")
      .send({ session_id: "some_session_id" }); // Missing user_id

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/Missing 'user_id'/i);
  });

  it("should return 400 if Stripe session is not found or not paid", async () => {
    pingDatabase.mockResolvedValue();

    // Mock the Stripe session retrieve to return no session
    mockStripe.checkout.sessions.retrieve.mockResolvedValue({
      payment_status: "unpaid", // Not 'paid'
      metadata: { orderId: 999 },
    });

    const response = await request(app)
      .post("/api/cart/markOrderPaidAndClearCart")
      .send({ session_id: "bad_session_id", user_id: 10 });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(
      /Session not found or payment not completed!/i
    );
  });

  it("should return 400 if orderId metadata is missing", async () => {
    pingDatabase.mockResolvedValue();

    mockStripe.checkout.sessions.retrieve.mockResolvedValue({
      payment_status: "paid",
      metadata: {}, // No orderId here
    });

    const response = await request(app)
      .post("/api/cart/markOrderPaidAndClearCart")
      .send({ session_id: "some_session_id", user_id: 10 });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/Order ID missing/i);
  });

  it("should return 400 if no pending order is found", async () => {
    pingDatabase.mockResolvedValue();

    // A valid Stripe session
    mockStripe.checkout.sessions.retrieve.mockResolvedValue({
      payment_status: "paid",
      metadata: { orderId: 999 },
    });

    // Mock DB returns null
    mockFindOrder.mockResolvedValue(null);

    const response = await request(app)
      .post("/api/cart/markOrderPaidAndClearCart")
      .send({ session_id: "some_session", user_id: 10 });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/No pending order found/i);
  });

  it("should return 200 on successful payment & stock update", async () => {
    pingDatabase.mockResolvedValue();

    // 1) Stripe session is valid
    mockStripe.checkout.sessions.retrieve.mockResolvedValue({
      payment_status: "paid",
      metadata: { orderId: 999 },
    });

    // 2) Mock findOne for Order
    mockFindOrder.mockResolvedValue({
      id: 999,
      userId: 10,
      status: "Pending",
      items: [
        { variationId: 77, quantity: 2 },
        { variationId: 77, quantity: 3 }, // same variation repeated
        { variationId: 88, quantity: 1 },
      ],
      update: vi.fn(),
    });

    // 3) Mock Variation findOne
    mockFindVariation
      .mockResolvedValueOnce({
        id: 77,
        stock: 100,
        update: vi.fn(),
      })
      .mockResolvedValueOnce({
        id: 88,
        stock: 50,
        update: vi.fn(),
      });

    // 4) Check cart destroy
    mockCartDestroy.mockResolvedValue(1);

    const response = await request(app)
      .post("/api/cart/markOrderPaidAndClearCart")
      .send({ session_id: "abc123", user_id: 10 });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toMatch(/Order marked as Paid/i);

    // 5) Ensure transaction was used
    expect(mockTransaction).toHaveBeenCalled();
    // We can check commit or rollback calls within the function
    // They’re inside the returned transaction object.

    // 6) Variation stock update logic:
    //    Variation 77: total qty = 2 + 3 = 5 => new stock = 95
    //    Variation 88: total qty = 1 => new stock = 49
  });
});
