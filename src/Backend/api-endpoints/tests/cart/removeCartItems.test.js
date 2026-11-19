// tests/removeCartItem.test.js
import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express from "express";

// 1️⃣ Mock out database utils BEFORE importing `removeCartItem.js`
vi.mock("../../../database/utils.js", () => ({
  pingDatabase: vi.fn(),
  DatabaseConnectionError: class DatabaseConnectionError extends Error {},
  InputValidationError: class InputValidationError extends Error {},
  removeCartItemFromDB: vi.fn(),
}));

// 2️⃣ Import AFTER mocks
import {
  pingDatabase,
  removeCartItemFromDB,
  InputValidationError,
} from "../../../database/utils.js";
import removeCartItem from "../../cart/removeCartItems.js"; // Adjust path as needed

// 3️⃣ Create an Express test app
const app = express();
app.use(express.json());

// Define route with optional param so we can test "missing" param scenario
app.delete("/cartItem{/:cart_item_id}", (req, res) => removeCartItem(req, res));

// 4️⃣ No DB setup/teardown needed unless your project requires it
//    If you need real DB connections, do them in beforeAll/afterAll.

// 5️⃣ Write our tests
describe("DELETE /cartItem/:cart_item_id", () => {
  it("should return 400 if cart_item_id is missing", async () => {
    // Mock the DB ping to succeed
    pingDatabase.mockResolvedValue();

    // Make request without the cart_item_id param
    const response = await request(app).delete("/cartItem/");

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty(
      "message",
      "Missing parameter: cart_item_id."
    );
  });

  it("should return 200 when item is removed successfully", async () => {
    pingDatabase.mockResolvedValue();
    removeCartItemFromDB.mockResolvedValue();

    // Provide a valid cart_item_id
    const response = await request(app).delete("/cartItem/123");

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty(
      "message",
      "Item removed from cart successfully!"
    );
    // Check that removeCartItemFromDB was called with the correct param
    expect(removeCartItemFromDB).toHaveBeenCalledWith("123");
  });

  // We ignore 500-related tests per your instructions.
});
