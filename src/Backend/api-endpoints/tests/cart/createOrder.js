// tests/createOrder.test.js
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import bodyParser from "body-parser";

// ───────────────────────────────────────────────
// 0️⃣ Define fakeTransaction using "var" so it is hoisted
// ───────────────────────────────────────────────
var commitMock = vi.fn();
var rollbackMock = vi.fn();
var fakeTransaction = { commit: commitMock, rollback: rollbackMock };

// ───────────────────────────────────────────────
// 1️⃣ Mock database utilities BEFORE importing createOrder.js
// ───────────────────────────────────────────────
vi.mock("../../../database/utils.js", () => ({
  pingDatabase: vi.fn(),
  DatabaseConnectionError: class DatabaseConnectionError extends Error {},
  InputValidationError: class InputValidationError extends Error {},
  DatabaseError: class DatabaseError extends Error {},
}));

// ───────────────────────────────────────────────
// 2️⃣ Mock the database module BEFORE importing createOrder.js
// ───────────────────────────────────────────────
vi.mock("../../../database/index.js", () => {
  var createOrderMock = vi.fn();
  var createOrderItemMock = vi.fn();
  var findByPkMock = vi.fn();
  var transactionMock = vi.fn().mockResolvedValue(fakeTransaction);
  return {
    db: {
      sequelize: {
        transaction: transactionMock,
      },
      Order: {
        create: createOrderMock,
      },
      OrderItem: {
        create: createOrderItemMock,
      },
      Variations: {
        findByPk: findByPkMock,
      },
    },
  };
});

// ───────────────────────────────────────────────
// 3️⃣ Mock the Stripe module BEFORE importing createOrder.js
// ───────────────────────────────────────────────
var stripeCreateMock = vi.fn();
vi.mock("stripe", () => {
  return {
    default: class Stripe {
      constructor(secret) {
        // Optionally, verify secret if needed.
        this.checkout = { sessions: { create: stripeCreateMock } };
      }
    },
    stripeCreateMock,
  };
});

// ───────────────────────────────────────────────
// 4️⃣ Import modules AFTER mocks are set up
// ───────────────────────────────────────────────
import { db } from "../../../database/index.js";
import createOrder from "../../cart/createOrder.js"; // Adjust path if needed
import { pingDatabase } from "../../../database/utils.js";
import Stripe, { stripeCreateMock } from "stripe";

// For easier access to mocks:
const createOrderMock = db.Order.create;
const createOrderItemMock = db.OrderItem.create;
const findByPkMock = db.Variations.findByPk;

// ───────────────────────────────────────────────
// 5️⃣ Setup Express app for testing
// ───────────────────────────────────────────────
const app = express();
app.use(bodyParser.json());
app.post("/createOrder", createOrder);

beforeAll(async () => {
  // No real DB connection needed for unit tests.
});
afterAll(async () => {
  vi.resetAllMocks();
});

// ───────────────────────────────────────────────
// 6️⃣ Write the tests
// ───────────────────────────────────────────────
describe("POST /createOrder - createOrder API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 if 'user_id' is missing", async () => {
    const response = await request(app).post("/createOrder").send({
      items: [{ variation_id: 1, quantity: 2 }],
      shipping_address: "123 Test St",
      total_amount: 49.99,
      recipient_name: "Alice",
    });
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/Missing 'user_id'/i);
  });

  it("should return 400 if 'items' is missing or empty", async () => {
    // Missing items
    let response = await request(app).post("/createOrder").send({
      user_id: 1,
      shipping_address: "123 Test St",
      total_amount: 49.99,
      recipient_name: "Alice",
    });
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/Missing or invalid 'items'/i);

    // Empty items array
    response = await request(app).post("/createOrder").send({
      user_id: 1,
      items: [],
      shipping_address: "123 Test St",
      total_amount: 49.99,
      recipient_name: "Alice",
    });
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/Missing or invalid 'items'/i);
  });

  it("should return 400 if 'shipping_address' is missing", async () => {
    const response = await request(app).post("/createOrder").send({
      user_id: 1,
      items: [{ variation_id: 1, quantity: 2 }],
      total_amount: 49.99,
      recipient_name: "Alice",
    });
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/Missing 'shipping_address'/i);
  });

  it("should return 400 if 'total_amount' is missing", async () => {
    const response = await request(app).post("/createOrder").send({
      user_id: 1,
      items: [{ variation_id: 1, quantity: 2 }],
      shipping_address: "123 Test St",
      recipient_name: "Alice",
    });
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/Missing 'total_amount'/i);
  });

  it("should return 400 if 'recipient_name' is missing", async () => {
    const response = await request(app).post("/createOrder").send({
      user_id: 1,
      items: [{ variation_id: 1, quantity: 2 }],
      shipping_address: "123 Test St",
      total_amount: 49.99,
    });
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/Missing 'recipient_name'/i);
  });

  it("should return 400 if any item in 'items' misses variation_id or quantity", async () => {
    // Missing variation_id
    let response = await request(app).post("/createOrder").send({
      user_id: 1,
      items: [{ quantity: 2 }],
      shipping_address: "123 Test St",
      total_amount: 49.99,
      recipient_name: "Alice",
    });
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/variation_id and 'quantity'/i);

    // Missing quantity
    response = await request(app).post("/createOrder").send({
      user_id: 1,
      items: [{ variation_id: 10 }],
      shipping_address: "123 Test St",
      total_amount: 49.99,
      recipient_name: "Alice",
    });
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/variation_id and 'quantity'/i);
  });

  it("should return 400 if Variation is not found", async () => {
    pingDatabase.mockResolvedValue();
    // Simulate Order.create returns an order with id 123.
    createOrderMock.mockResolvedValue({ id: 123 });
    // Variation not found: findByPk returns null.
    findByPkMock.mockResolvedValue(null);

    const response = await request(app).post("/createOrder").send({
      user_id: 1,
      items: [{ variation_id: 999, quantity: 2 }],
      shipping_address: "123 Test St",
      total_amount: 99.99,
      recipient_name: "Alice",
    });
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/Variation with id 999 not found/i);
  });

  it("should return 200 and a sessionId if order is created successfully", async () => {
    const reqBody = {
      user_id: 1,
      items: [{ variation_id: 777, quantity: 2 }],
      shipping_address: "123 Test St",
      total_amount: 39.98,
      recipient_name: "Alice",
    };

    // Arrange: simulate successful DB ping.
    pingDatabase.mockResolvedValue();
    // Simulate order creation returning id 555.
    createOrderMock.mockResolvedValue({ id: 555 });
    // Simulate variation lookup returning a valid variation.
    findByPkMock.mockResolvedValue({ id: 777, name: "Test Variation", price: "19.99" });
    // Simulate OrderItem creation success.
    createOrderItemMock.mockResolvedValue({});
    // Simulate successful Stripe Checkout Session creation returning session id "session_abc123".
    stripeCreateMock.mockResolvedValue({ id: "session_abc123" });

    const response = await request(app).post("/createOrder").send(reqBody);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("sessionId", "session_abc123");

    // Verify that Order.create was called with correct data.
    expect(createOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        shippingAddress: "123 Test St",
        totalAmount: 39.98,
        recipientName: "Alice",
        status: "Pending",
      }),
      expect.any(Object) // transaction object
    );

    // Verify that OrderItem.create was called with the right data.
    expect(createOrderItemMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 555,
        variationId: 777,
        quantity: 2,
        price: 19.99,
      }),
      expect.any(Object)
    );

    // Verify that Stripe Checkout Session was created with expected parameters.
    expect(stripeCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_method_types: ["card"],
        mode: "payment",
        metadata: { orderId: 555, userId: 1 },
      })
    );

    // Verify that the transaction was committed.
    expect(fakeTransaction.commit).toHaveBeenCalled();
  });
});
