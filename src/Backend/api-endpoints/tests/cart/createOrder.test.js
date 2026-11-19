// tests/createOrder.test.js
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import express from "express";

// 1️⃣ **Mock dependencies BEFORE importing createOrder.js**
vi.mock("../../../database/utils.js", () => ({
  pingDatabase: vi.fn(),
  InputValidationError: class InputValidationError extends Error {},
  DatabaseConnectionError: class DatabaseConnectionError extends Error {},
  DatabaseError: class DatabaseError extends Error {},
}));

vi.mock("../../../database/index.js", () => ({
  db: {
    sequelize: {
      // Mock transaction to return an object with commit & rollback
      transaction: vi.fn(() =>
        Promise.resolve({
          commit: vi.fn(() => Promise.resolve()),
          rollback: vi.fn(() => Promise.resolve()),
        })
      ),
      authenticate: vi.fn(() => Promise.resolve()),
      sync: vi.fn(() => Promise.resolve()),
      close: vi.fn(() => Promise.resolve()),
    },
    Order: {
      create: vi.fn(),
    },
    OrderItem: {
      create: vi.fn(),
    },
    Variations: {
      findByPk: vi.fn(),
    },
  },
}));

// 2️⃣ **Mock Stripe to avoid real API calls**
vi.mock("stripe", () => {
  return {
    default: vi.fn().mockImplementation(function () {
      return {
        checkout: {
          sessions: {
            create: vi.fn(() =>
              Promise.resolve({ id: "test_session_id", url: "https://checkout.stripe.com/c/pay/test_session_id" })
            ),
          },
        },
      };
    }),
  };
});

// 3️⃣ **Import createOrder after mocks**
import createOrder from "../../cart/createOrder.js"; // Adjust path if needed
import { db } from "../../../database/index.js";
import { pingDatabase } from "../../../database/utils.js";

// 4️⃣ **Setup Express app**
const app = express();
app.use(express.json());
app.post("/createOrder", createOrder);

// 5️⃣ **Ensure the database is ready**
beforeAll(async () => {
  await db.sequelize.authenticate();
  await db.sequelize.sync({ force: false });
});
afterAll(async () => {
  await db.sequelize.close();
});

describe("POST /createOrder API Tests", () => {
  it("should return 400 if 'user_id' is missing", async () => {
    pingDatabase.mockResolvedValue();

    const orderData = {
      // user_id is missing here
      items: [{ variation_id: 1, quantity: 2 }],
      shipping_address: "123 Test St",
      total_amount: 100,
      recipient_name: "John Doe",
      phoneNumber: "0123456789",
    };

    const response = await request(app)
      .post("/createOrder")
      .send(orderData);

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty(
      "message",
      "Missing 'user_id' in the request body!"
    );
  });

  it("should return 400 if 'items' array is missing or empty", async () => {
    pingDatabase.mockResolvedValue();

    const orderData = {
      user_id: 1,
      items: [], // empty array triggers validation
      shipping_address: "123 Test St",
      total_amount: 100,
      recipient_name: "John Doe",
      phoneNumber: "0123456789",
    };

    const response = await request(app)
      .post("/createOrder")
      .send(orderData);

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty(
      "message",
      "Missing or invalid 'items' in the request body!"
    );
  });

  it("should return 400 if 'recipient_name' is missing", async () => {
    pingDatabase.mockResolvedValue();

    const orderData = {
      user_id: 1,
      items: [{ variation_id: 1, quantity: 2 }],
      shipping_address: "123 Test St",
      total_amount: 100,
      // recipient_name is missing
    };

    const response = await request(app)
      .post("/createOrder")
      .send(orderData);

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty(
      "message",
      "Missing 'recipient_name' in the request body!"
    );
  });

  it("should return 400 if a provided variation is not found", async () => {
    pingDatabase.mockResolvedValue();
    // Simulate variation not found
    db.Variations.findByPk.mockResolvedValue(null);

    const orderData = {
      user_id: 1,
      items: [{ variation_id: 999, quantity: 2 }], // non-existent variation id
      shipping_address: "123 Test St",
      total_amount: 100,
      recipient_name: "John Doe",
      phoneNumber: "0123456789",
    };

    const response = await request(app)
      .post("/createOrder")
      .send(orderData);

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/Variation with id 999 not found/);
  });

  it("should create an order and return a session id on success", async () => {
    pingDatabase.mockResolvedValue();

    // Mock a found variation
    db.Variations.findByPk.mockResolvedValue({
      id: 1,
      price: "50.00", // as string so parseFloat works
      name: "Test Variation",
    });

    // Mock Order and OrderItem creations
    db.Order.create.mockResolvedValue({ id: 123 });
    db.OrderItem.create.mockResolvedValue({});

    const orderData = {
      user_id: 1,
      items: [{ variation_id: 1, quantity: 2 }],
      shipping_address: "123 Test St",
      total_amount: 100,
      recipient_name: "John Doe",
      phoneNumber: "0123456789",
    };

    const response = await request(app)
      .post("/createOrder")
      .send(orderData);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("sessionId", "test_session_id");
    expect(response.body).toHaveProperty("url", "https://checkout.stripe.com/c/pay/test_session_id");
  });
});
