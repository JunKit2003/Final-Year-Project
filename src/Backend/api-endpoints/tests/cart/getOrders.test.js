// tests/getOrders.test.js
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import express from "express";

// 1️⃣ **Mock out database utils BEFORE importing `getOrders.js`**
vi.mock("../../../database/utils.js", () => ({
  pingDatabase: vi.fn(),
  DatabaseConnectionError: class DatabaseConnectionError extends Error {},
  InputValidationError: class InputValidationError extends Error {},
  DatabaseError: class DatabaseError extends Error {},
  getAllOrdersFromDB: vi.fn(),
}));

// 2️⃣ **Import the modules AFTER the mocks**
import {
  pingDatabase,
  InputValidationError,
  getAllOrdersFromDB,
} from "../../../database/utils.js";
import getOrders from "../../cart/getOrders.js";

// 3️⃣ **Set up a minimal Express app for testing**
const app = express();
app.use(express.json());

// The route: POST /api/order/get
app.post("/api/cart/get", (req, res) => getOrders(req, res));

// 4️⃣ **No actual database usage here, so we skip mocking any real DB calls** 
//    (If you need a DB connection, you can mock or set it up similarly.)
//    We'll show placeholders for beforeAll/afterAll if you have a real DB in your stack.

beforeAll(async () => {
  // If you had a real DB, you might do:
  // await db.sequelize.authenticate();
  // await db.sequelize.sync({ force: false });
});

afterAll(async () => {
  // If you had a real DB, you might close your DB connection:
  // await db.sequelize.close();
});

// 5️⃣ **Write the tests**
describe("POST /api/cart/get - getOrders API", () => {
  it("should return 200 if orders are fetched successfully", async () => {
    // Mock a successful ping and orders fetch
    pingDatabase.mockResolvedValue();
    getAllOrdersFromDB.mockResolvedValue([
      { id: 1, userId: 10, total: 100 },
      { id: 2, userId: 20, total: 200 },
    ]);

    const res = await request(app).post("/api/cart/get").send();

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("orders");
    expect(res.body.orders).toEqual([
      { id: 1, userId: 10, total: 100 },
      { id: 2, userId: 20, total: 200 },
    ]);

    // Verify our mocks were called
    expect(pingDatabase).toHaveBeenCalled();
    expect(getAllOrdersFromDB).toHaveBeenCalled();
  });

  it("should return 400 if an input validation error is thrown", async () => {
    // Suppose your code might throw InputValidationError 
    // if certain conditions are not met (like missing userId).
    // We simulate that here.
    pingDatabase.mockResolvedValue();
    getAllOrdersFromDB.mockRejectedValue(
      new InputValidationError("Missing userId!")
    );

    const res = await request(app).post("/api/cart/get").send();

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message", "Missing userId!");
  });

  // We ignore 500 tests since you requested that.
});
