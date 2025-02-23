// tests/getCustomerOrder.test.js
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import express from "express";

// 1️⃣ Mock out the database utils BEFORE importing the controller
vi.mock("../../../database/utils.js", () => ({
  pingDatabase: vi.fn(),
  DatabaseConnectionError: class DatabaseConnectionError extends Error {},
  InputValidationError: class InputValidationError extends Error {},
  DatabaseError: class DatabaseError extends Error {},
}));

// 2️⃣ Mock out the db models
vi.mock("../../../database/index.js", () => {
  // Return a mock of your db object
  return {
    db: {
      sequelize: {
        authenticate: vi.fn(),
        sync: vi.fn(),
        close: vi.fn(),
      },
      Order: {
        findOne: vi.fn(),
      },
      // If you need to reference this in "include", define a mock OrderItem
      OrderItem: {},
    },
  };
});

// 3️⃣ AFTER mocks are set, import the actual modules
import { db } from "../../../database/index.js"; // This will be the mocked version
import {
  pingDatabase,
  InputValidationError,
  DatabaseError,
  DatabaseConnectionError,
} from "../../../database/utils.js";
import getCustomerOrder from "../../cart/getCustomerOrder.js";

// 4️⃣ Setup a minimal Express app for testing
const app = express();
app.use(express.json());

// Your route: POST /api/order/getCustomerOrder
app.post("/api/cart/getCustomerOrder", (req, res) => getCustomerOrder(req, res));

// 5️⃣ Before all tests, ensure DB methods are accessible (we're just calling the mocks)
beforeAll(async () => {
  // We won't actually connect, but let's call them so our tests remain consistent.
  await db.sequelize.authenticate();
  await db.sequelize.sync({ force: false });
});

afterAll(async () => {
  // Close mock DB connection
  await db.sequelize.close();
});

// 6️⃣ Start writing tests
describe("POST /api/cart/getCustomerOrder", () => {
  it("should return 400 if 'orderId' is missing", async () => {
    // Mock the DB ping to succeed
    pingDatabase.mockResolvedValue();

    // Make request without orderId
    const response = await request(app)
      .post("/api/cart/getCustomerOrder")
      .send({ userId: 10 }); // missing orderId

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty(
      "message",
      "Missing 'orderId' in the request body!"
    );
  });

  it("should return 400 if 'userId' is missing", async () => {
    pingDatabase.mockResolvedValue();

    // Make request without userId
    const response = await request(app)
      .post("/api/cart/getCustomerOrder")
      .send({ orderId: 999 }); // missing userId

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty(
      "message",
      "Missing 'userId' in the request body!"
    );
  });

  it("should return 404 if order is not found or doesn't belong to user", async () => {
    pingDatabase.mockResolvedValue();
    // Mock the Order model so it returns null -> "not found"
    db.Order.findOne.mockResolvedValue(null);

    const response = await request(app)
      .post("/api/cart/getCustomerOrder")
      .send({ orderId: 123, userId: 1 });

    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty(
      "message",
      "Order not found or you do not have permission to view it."
    );
  });

  it("should return 200 if order is found", async () => {
    pingDatabase.mockResolvedValue();
    // Mock a found order
    db.Order.findOne.mockResolvedValue({
      id: 123,
      userId: 1,
      items: [{ id: 1, productName: "Sample Item" }],
      get: function () {
        // Simulate Sequelize's get({ plain:true })
        return {
          id: 123,
          userId: 1,
          items: [{ id: 1, productName: "Sample Item" }],
        };
      },
    });

    const response = await request(app)
      .post("/api/cart/getCustomerOrder")
      .send({ orderId: 123, userId: 1 });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("order");
    expect(response.body.order).toEqual({
      id: 123,
      userId: 1,
      items: [{ id: 1, productName: "Sample Item" }],
    });
  });
});
