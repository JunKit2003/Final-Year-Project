// tests/cart/cancelOrder.test.js
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import express from "express";
import bodyParser from "body-parser";

// 1️⃣ Mock the exact same path used by cancelOrder.js
vi.mock("../../../database/utils.js", () => ({
  pingDatabase: vi.fn(),
  DatabaseConnectionError: class DatabaseConnectionError extends Error {},
  InputValidationError: class InputValidationError extends Error {},
  DatabaseError: class DatabaseError extends Error {},
}));

vi.mock("../../../database/index.js", () => {
  const commitMock = vi.fn();
  const rollbackMock = vi.fn();

  const transactionMockImplementation = {
    commit: commitMock,
    rollback: rollbackMock,
  };
  // transaction() returns a promise that resolves to that object
  const transactionMock = vi.fn(() => Promise.resolve(transactionMockImplementation));

  const findOneMock = vi.fn();

  return {
    db: {
      sequelize: {
        transaction: transactionMock,
      },
      Order: {
        findOne: findOneMock,
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
          retrieve: vi.fn(),
        },
      };
    },
  };
});

import { db } from "../../../database/index.js";
import cancelOrder from "../../cart/cancelOrder.js";
import {
  pingDatabase,
  DatabaseConnectionError,
  InputValidationError,
  DatabaseError,
} from "../../../database/utils.js";
import Stripe from "stripe";

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
const transactionMock = db.sequelize.transaction;
const findOneMock = db.Order.findOne;

// For convenience, keep references to commit/rollback
let commitMock;
let rollbackMock;

beforeAll(() => {
  // Because transactionMock returns a promise, we can do:
  const call = transactionMock.mock.results[0];
  if (call) {
    const value = call.value; // the actual Promise
    commitMock = value.commit;
    rollbackMock = value.rollback;
  }
});

// 2️⃣ Decide on the correct HTTP method
const app = express();
app.use(bodyParser.json());
app.delete("/cancelOrder", cancelOrder);

// 3️⃣ Tests
describe("cancelOrder API Tests", () => {

  it("should return 400 if 'session_id' is missing", async () => {
    const response = await request(app).delete("/cancelOrder").send({
      user_id: 123,
    });
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/Missing 'session_id'/i);
  });

  it("should return 400 if 'user_id' is missing", async () => {
    const response = await request(app).delete("/cancelOrder").send({
      session_id: "fake_session_id",
    });
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/Missing 'user_id'/i);
  });

  it("should return 400 if payment_status is 'paid'", async () => {
    pingDatabase.mockResolvedValue();
    stripeInstance.checkout.sessions.retrieve.mockResolvedValue({
      payment_status: "paid",
      metadata: { orderId: "ABC123" },
    });

    const response = await request(app).delete("/cancelOrder").send({
      session_id: "fake_session_id",
      user_id: 1,
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/already been paid/i);
  });

  it("should return 400 if orderId is missing in session metadata", async () => {
    pingDatabase.mockResolvedValue();
    stripeInstance.checkout.sessions.retrieve.mockResolvedValue({
      payment_status: "unpaid",
      metadata: {},
    });

    const response = await request(app).delete("/cancelOrder").send({
      session_id: "fake_session_id",
      user_id: 1,
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/Order ID missing/i);
  });

  it("should return 400 if no 'Pending' order is found", async () => {
    pingDatabase.mockResolvedValue();
    stripeInstance.checkout.sessions.retrieve.mockResolvedValue({
      payment_status: "unpaid",
      metadata: { orderId: "ABC123" },
    });
    // findOne returns null
    findOneMock.mockResolvedValue(null);

    const response = await request(app).delete("/cancelOrder").send({
      session_id: "fake_session_id",
      user_id: 999,
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/No 'Pending' order found/i);
  });

  it("should return 200 and cancel the order on success", async () => {
    pingDatabase.mockResolvedValue();
    stripeInstance.checkout.sessions.retrieve.mockResolvedValue({
      payment_status: "unpaid",
      metadata: { orderId: "ORDER_123" },
    });

    // findOne returns an order with a destroy() method
    const destroyMock = vi.fn();
    findOneMock.mockResolvedValue({
      id: "ORDER_123",
      destroy: destroyMock,
    });

    const response = await request(app).delete("/cancelOrder").send({
      session_id: "valid_session",
      user_id: 1,
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Order canceled/deleted successfully.");
    expect(destroyMock).toHaveBeenCalled();
  });

  it("should handle DB connection errors with 500", async () => {
    pingDatabase.mockRejectedValue(new DatabaseConnectionError("Test DB error"));

    const response = await request(app).delete("/cancelOrder").send({
      session_id: "fake_session",
      user_id: 1,
    });

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe("Unable to connect to the database!");
  });
});
