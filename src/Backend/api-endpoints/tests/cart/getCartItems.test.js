// tests/getCartItems.test.js
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import express from "express";

// 1️⃣ **Mock dependencies BEFORE importing `getCartItems.js`**
vi.mock("../../../database/utils.js", () => ({
  pingDatabase: vi.fn(),
  getCartItemsFromDB: vi.fn(),
  InputValidationError: class InputValidationError extends Error {},
  DatabaseConnectionError: class DatabaseConnectionError extends Error {},
}));

// 2️⃣ **Import modules AFTER mocks**
import { db } from "../../../database/index.js"; // Adjust path if needed
import getCartItems from "../../cart/getCartItems.js"; // Adjust path if needed
import {
  pingDatabase,
  getCartItemsFromDB,
  InputValidationError,
  DatabaseConnectionError,
} from "../../../database/utils.js";

// 3️⃣ **Setup Express app**
const app = express();
app.use(express.json());

// Note the `?` to allow for an optional param so we can test "missing" param scenario
app.get("/getCartItems{/:user_id}", (req, res) => getCartItems(req, res));

// 4️⃣ **Ensure database is ready before running tests**
beforeAll(async () => {
  await db.sequelize.authenticate();
  await db.sequelize.sync({ force: false });
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("GET /getCartItems/:user_id API Tests", () => {
  it("should return 400 if 'user_id' param is missing", async () => {
    // We don’t provide user_id at all -> user_id will be undefined (or empty string if route matches)
    // This triggers InputValidationError in the controller.
    pingDatabase.mockResolvedValue(); // Simulate successful DB ping

    const response = await request(app).get("/getCartItems/");

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("message", "Missing parameter: user_id.");
  });

  it("should return 200 with cart items if 'user_id' param is provided", async () => {
    // Mock successful DB operations
    pingDatabase.mockResolvedValue();
    getCartItemsFromDB.mockResolvedValue([
      { id: 1, itemName: "Test Item 1" },
      { id: 2, itemName: "Test Item 2" },
    ]);

    const response = await request(app).get("/getCartItems/123"); // user_id = 123

    expect(response.statusCode).toBe(200);
    // The controller returns whatever getCartItemsFromDB returns
    expect(response.body).toEqual([
      { id: 1, itemName: "Test Item 1" },
      { id: 2, itemName: "Test Item 2" },
    ]);
    // Ensure the right DB calls were made
    expect(pingDatabase).toHaveBeenCalled();
    expect(getCartItemsFromDB).toHaveBeenCalledWith("123");
  });
});
