// tests/deleteProduct.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";

// 1️⃣ Mock DB utils BEFORE importing the controller
vi.mock("../../../database/utils.js", () => ({
  DatabaseConnectionError: class DatabaseConnectionError extends Error {},
  InputValidationError: class InputValidationError extends Error {},
  ProductNotFoundError: class ProductNotFoundError extends Error {},
  deleteProductFromDB: vi.fn(),
}));

// 2️⃣ Import after mocks
import {
  deleteProductFromDB,
  InputValidationError,
  ProductNotFoundError,
} from "../../../database/utils.js";
import deleteProduct from "../../products/deleteProduct.js"; // Adjust path

// 3️⃣ Set up an Express test app
const app = express();
app.use(express.json());

// Example route: DELETE /api/products/delete/:id
app.delete("/api/products/delete/:id", (req, res) => deleteProduct(req, res));

describe("DELETE /api/products/delete/:id", () => {
  // Clear mocks before each test so calls don’t leak between tests
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 if an InputValidationError or SyntaxError is thrown", async () => {
    // Simulate your DB call throwing an InputValidationError
    deleteProductFromDB.mockRejectedValue(
      new InputValidationError("Invalid product ID!")
    );

    const response = await request(app).delete("/api/products/delete/123");

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message", "Invalid product ID!");
  });

  it("should return 409 if ProductNotFoundError is thrown", async () => {
    // Simulate product not found scenario
    deleteProductFromDB.mockRejectedValue(
      new ProductNotFoundError("Product not found!")
    );

    const response = await request(app).delete("/api/products/delete/999");

    expect(response.status).toBe(409);
    expect(response.body).toHaveProperty("message", "Product not found!");
  });

  it("should return 200 if product is deleted successfully", async () => {
    // Simulate successful delete
    deleteProductFromDB.mockResolvedValue();

    const response = await request(app).delete("/api/products/delete/123");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("message", "Product deleted successfully!");
    // Confirm the DB utility was called with the correct ID
    expect(deleteProductFromDB).toHaveBeenCalledWith("123");
  });

  // We ignore 500-related tests (DatabaseConnectionError, etc.) per instructions.
});
