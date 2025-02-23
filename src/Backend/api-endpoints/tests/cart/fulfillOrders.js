// tests/cart/fulfillOrders.test.js
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import express from "express";

// 1️⃣ Mock dependencies BEFORE importing `fulfillOrders.js`
vi.mock("../../../database/utils.js", () => ({
  pingDatabase: vi.fn(),
  setOrderStatusInDB: vi.fn(),
  InputValidationError: class InputValidationError extends Error {},
  DatabaseConnectionError: class DatabaseConnectionError extends Error {},
  DatabaseError: class DatabaseError extends Error {},
}));

// 2️⃣ Import modules AFTER mocks
import fulfillOrders from "../../cart/fulfillOrders.js"; // Corrected import
import {
  pingDatabase,
  setOrderStatusInDB,
  InputValidationError,
} from "../../../database/utils.js";

// 3️⃣ Setup Express app
const app = express();
app.use(express.json());
app.patch("/api/cart/fulfillOrders/:orderId", fulfillOrders); // Corrected API route

beforeAll(() => {
  // Any setup needed before tests (not necessary for pure unit tests)
});
afterAll(() => {
  vi.resetAllMocks();
});

describe("fulfillOrders API Tests (ignoring 500 errors)", () => {
  it("should return 401 if user is not logged in", async () => {
    const response = await request(app)
      .patch("/api/cart/fulfillOrders/123") // Corrected route path
      .send()
      .set("Cookie", ""); // No session cookie

    expect(response.statusCode).toBe(401);
    expect(response.body.message).toMatch(/Unauthorized: Please log in/i);
  });

  it("should return 403 if user is not an admin", async () => {
    const response = await request(app)
      .patch("/api/cart/fulfillOrders/123") // Corrected route path
      .send()
      .set("Cookie", "session=validSession") // Simulating a valid session
      .set("X-User-Category", "Customer"); // Simulating a non-admin user

    expect(response.statusCode).toBe(403);
    expect(response.body.message).toMatch(/Forbidden: Admin access required/i);
  });

  it("should return 404 if 'orderId' is missing", async () => {
    const response = await request(app)
      .patch("/api/cart/fulfillOrders/") // No orderId, should return 404
      .send()
      .set("Cookie", "session=validSession")
      .set("X-User-Category", "Admin");

    expect(response.statusCode).toBe(404); // Express usually returns 404 if params are missing
  });

  it("should return 400 if 'orderId' is invalid", async () => {
    pingDatabase.mockResolvedValue();

    const response = await request(app)
      .patch("/api/cart/fulfillOrders/invalidID") // Invalid orderId format
      .send()
      .set("Cookie", "session=validSession")
      .set("X-User-Category", "Admin");

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/Missing parameter: orderId/i);
  });

  it("should return 200 and mark order as Completed", async () => {
    pingDatabase.mockResolvedValue();
    setOrderStatusInDB.mockResolvedValue();

    const response = await request(app)
      .patch("/api/cart/fulfillOrders/123") // Corrected route path
      .send()
      .set("Cookie", "session=validSession")
      .set("X-User-Category", "Admin");

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Order marked as Completed!");
    expect(setOrderStatusInDB).toHaveBeenCalledWith("123", "Completed");
  });
});
