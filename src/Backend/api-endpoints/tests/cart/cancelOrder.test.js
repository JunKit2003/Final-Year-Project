import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";

// 0️⃣ **Ensure the Stripe retrieve mock is declared before it's used in any mock**
const stripeRetrieveMock = vi.fn();

// 1️⃣ **Mock dependencies BEFORE importing cancelOrder.js**
vi.mock("../../../database/utils.js", () => ({
  pingDatabase: vi.fn(),
  InputValidationError: class InputValidationError extends Error {},
  DatabaseConnectionError: class DatabaseConnectionError extends Error {},
  DatabaseError: class DatabaseError extends Error {},
}));

vi.mock("../../../database/index.js", () => ({
  db: {
    sequelize: {
      // Return a mock transaction with commit & rollback methods.
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
      findOne: vi.fn(),
    },
  },
}));

// 2️⃣ **Mock Stripe to avoid real API calls**
vi.mock("stripe", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      checkout: {
        sessions: {
          retrieve: (...args) => stripeRetrieveMock(...args),
        },
      },
    })),
  };
});

// 3️⃣ **Import cancelOrder after mocks**
import cancelOrder from "../../cart/cancelOrder.js";
import { db } from "../../../database/index.js";
import { pingDatabase } from "../../../database/utils.js";

// 4️⃣ **Setup Express app**
const app = express();
app.use(express.json());
app.post("/cancelOrder", cancelOrder);

// 5️⃣ **Ensure the database is ready**
beforeAll(async () => {
  await db.sequelize.authenticate();
  await db.sequelize.sync({ force: false });
});
afterAll(async () => {
  await db.sequelize.close();
});

// 6️⃣ **Clear mocks before each test**
beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /cancelOrder API Tests", () => {
  it("should return 400 if 'session_id' is missing", async () => {
    // pingDatabase resolves successfully.
    pingDatabase.mockResolvedValue();

    const requestBody = {
      user_id: 1,
      // session_id is missing
    };

    const response = await request(app)
      .post("/cancelOrder")
      .send(requestBody);

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty(
      "message",
      "Missing 'session_id' in the request body!"
    );
  });

  it("should return 400 if 'user_id' is missing", async () => {
    pingDatabase.mockResolvedValue();

    const requestBody = {
      session_id: "test_session_id",
      // user_id is missing
    };

    const response = await request(app)
      .post("/cancelOrder")
      .send(requestBody);

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty(
      "message",
      "Missing 'user_id' in the request body!"
    );
  });

  it("should return 400 if the Stripe session has already been paid", async () => {
    pingDatabase.mockResolvedValue();

    // Simulate Stripe session with payment_status "paid"
    stripeRetrieveMock.mockResolvedValue({
      payment_status: "paid",
    });

    const requestBody = {
      session_id: "test_session_id",
      user_id: 1,
    };

    const response = await request(app)
      .post("/cancelOrder")
      .send(requestBody);

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty(
      "message",
      "This order has already been paid, cannot delete!"
    );
  });

  it("should return 400 if orderId is missing in Stripe session metadata", async () => {
    pingDatabase.mockResolvedValue();

    // Stripe session with no metadata.orderId
    stripeRetrieveMock.mockResolvedValue({
      payment_status: "unpaid",
      metadata: {},
    });

    const requestBody = {
      session_id: "test_session_id",
      user_id: 1,
    };

    const response = await request(app)
      .post("/cancelOrder")
      .send(requestBody);

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty(
      "message",
      "Order ID missing in Stripe session metadata!"
    );
  });

  it("should return 400 if no matching 'Pending' order is found", async () => {
    pingDatabase.mockResolvedValue();

    // Simulate a valid Stripe session
    stripeRetrieveMock.mockResolvedValue({
      payment_status: "unpaid",
      metadata: { orderId: "123" },
    });

    // Simulate no order found in the database.
    db.Order.findOne.mockResolvedValue(null);

    const requestBody = {
      session_id: "test_session_id",
      user_id: 1,
    };

    const response = await request(app)
      .post("/cancelOrder")
      .send(requestBody);

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(
      /No 'Pending' order found for user 1 with orderId 123/
    );
  });

  it("should cancel the order and return 200 on success", async () => {
    pingDatabase.mockResolvedValue();

    // Simulate a valid Stripe session with orderId in metadata.
    stripeRetrieveMock.mockResolvedValue({
      payment_status: "unpaid",
      metadata: { orderId: "123" },
    });

    // Create a fake order with a destroy method.
    const fakeOrder = {
      destroy: vi.fn(() => Promise.resolve()),
    };

    // Simulate finding a 'Pending' order.
    db.Order.findOne.mockResolvedValue(fakeOrder);

    const requestBody = {
      session_id: "test_session_id",
      user_id: 1,
    };

    const response = await request(app)
      .post("/cancelOrder")
      .send(requestBody);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty(
      "message",
      "Order canceled/deleted successfully."
    );
    // Verify that the order.destroy was called.
    expect(fakeOrder.destroy).toHaveBeenCalled();
  });
});
