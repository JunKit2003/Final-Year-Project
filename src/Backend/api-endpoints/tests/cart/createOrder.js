// tests/cart/createOrder.test.js
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import express from "express";
import bodyParser from "body-parser";

// 1️⃣ Mock dependencies BEFORE importing `createOrder.js`
vi.mock("../../../database/utils.js", () => ({
  pingDatabase: vi.fn(),
  DatabaseConnectionError: class DatabaseConnectionError extends Error {},
  InputValidationError: class InputValidationError extends Error {},
  DatabaseError: class DatabaseError extends Error {},
}));

vi.mock("../../../database/index.js", () => {
  // Mocks for sequelize transaction
  const commitMock = vi.fn();
  const rollbackMock = vi.fn();
  const transactionMock = vi.fn().mockResolvedValue({
    commit: commitMock,
    rollback: rollbackMock,
  });

  // Mocks for Models
  const createOrderMock = vi.fn();
  const createOrderItemMock = vi.fn();
  const findByPkMock = vi.fn();

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

// Mock Stripe
vi.mock("stripe", () => {
  return {
    default: class Stripe {
      constructor() {}
      checkout = {
        sessions: {
          create: vi.fn(),
        },
      };
    },
  };
});

// 2️⃣ Import modules AFTER mocks
import { db } from "../../../database/index.js";
import createOrder from "../../cart/createOrder.js"; 
// Adjust the path if your "createOrder.js" is located differently.

import {
  pingDatabase,
  InputValidationError,
} from "../../../database/utils.js";
import Stripe from "stripe";

// Access some of our mocks for easier reference
const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
const transactionMock = db.sequelize.transaction;
const createOrderMock = db.Order.create;
const createOrderItemMock = db.OrderItem.create;
const findByPkMock = db.Variations.findByPk;

// 3️⃣ Setup a minimal Express app to test our controller
const app = express();
app.use(bodyParser.json());

// The real route might be POST /createOrder:
app.post("/createOrder", createOrder);

beforeAll(async () => {
  // If purely unit testing, no real DB connections needed
});
afterAll(async () => {
  vi.resetAllMocks(); // or vi.clearAllMocks()
});

describe("createOrder API Tests (ignoring 500 errors)", () => {
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

    // Empty items
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
    createOrderMock.mockResolvedValue({ id: 123 }); 
    // Variation not found -> findByPk returns null
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

  it("should return 200 and create order on success", async () => {
    // Mock all dependencies
    pingDatabase.mockResolvedValue();
    createOrderMock.mockResolvedValue({ id: 555 });
    findByPkMock.mockResolvedValue({ id: 777, name: "Test Variation", price: "19.99" });
    createOrderItemMock.mockResolvedValue({}); // no real return needed

    // Mock Stripe session creation
    const stripeSessionCreateMock = stripeInstance.checkout.sessions.create;
    stripeSessionCreateMock.mockResolvedValue({ id: "session_abc123" });

    const response = await request(app).post("/createOrder").send({
      user_id: 1,
      items: [{ variation_id: 777, quantity: 2 }],
      shipping_address: "123 Test St",
      total_amount: 39.98,
      recipient_name: "Alice",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("sessionId", "session_abc123");
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
    expect(createOrderItemMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 555,
        variationId: 777,
        quantity: 2,
        price: 19.99,
      }),
      expect.any(Object)
    );
    expect(stripeSessionCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_method_types: ["card"],
        mode: "payment",
        metadata: { orderId: 555, userId: 1 },
      })
    );
  });
});
