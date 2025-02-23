// tests/getUserOrders.test.js

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import express from "express";

// 1️⃣ Mock out database utils BEFORE importing `getUserOrders.js`
vi.mock("../../../database/utils.js", () => ({
  pingDatabase: vi.fn(),
  DatabaseConnectionError: class DatabaseConnectionError extends Error {},
  InputValidationError: class InputValidationError extends Error {},
  DatabaseError: class DatabaseError extends Error {},
  // The function your controller calls
  getUserOrdersFromDB: vi.fn(),
}));

// 2️⃣ Import AFTER mocks
import {
  pingDatabase,
  InputValidationError,
  getUserOrdersFromDB,
} from "../../../database/utils.js";
import getUserOrders from "../../cart/getUserOrders.js";

// 3️⃣ Create an Express test app
const app = express();
app.use(express.json());

// Route defined with an optional param (`:userId?`) so we can test "missing" userId.
app.get("/api/cart/getUserOrders/:userId?", (req, res) => getUserOrders(req, res));

// 4️⃣ (Optional) If you have a real DB, mock or set up DB calls in beforeAll/afterAll.
beforeAll(async () => {
  // e.g. db.sequelize.authenticate(), etc. if needed
});

afterAll(async () => {
  // e.g. db.sequelize.close(), etc. if needed
});

// 5️⃣ Write tests
describe("GET /api/cart/getUserOrders/:userId", () => {
  it("should return 400 if userId is missing", async () => {
    // Simulate successful DB ping
    pingDatabase.mockResolvedValue();

    // Make a GET request *without* the userId (i.e., the optional param is absent)
    const response = await request(app).get("/api/cart/getUserOrders");

    // Expect 400 because userId param is missing
    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty(
      "message",
      "Missing userId in route parameters!"
    );
  });

  it("should return 200 with orders if userId is provided", async () => {
    pingDatabase.mockResolvedValue();

    // Mock orders from getUserOrdersFromDB
    getUserOrdersFromDB.mockResolvedValue([
      { id: 101, userId: 123, total: 150.5 },
      { id: 102, userId: 123, total: 99.99 },
    ]);

    // Provide the userId in the route
    const response = await request(app).get("/api/cart/getUserOrders/123");

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("orders");
    expect(response.body.orders).toEqual([
      { id: 101, userId: 123, total: 150.5 },
      { id: 102, userId: 123, total: 99.99 },
    ]);

    // Ensure our mocks were actually called
    expect(pingDatabase).toHaveBeenCalled();
    expect(getUserOrdersFromDB).toHaveBeenCalledWith("123");
  });

  // We ignore 500 errors (DatabaseConnectionError, DatabaseError) per your request.
});
