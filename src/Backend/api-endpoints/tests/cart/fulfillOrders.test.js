// tests/fulfillOrder.test.js
import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";

// ───────────────────────────────────────────────
// 1️⃣ Mock Dependencies BEFORE Importing Controller
// ───────────────────────────────────────────────
vi.mock("../../../database/utils.js", () => ({
  pingDatabase: vi.fn(),
  setOrderStatusInDB: vi.fn(),
  InputValidationError: class InputValidationError extends Error {
    constructor(message) {
      super(message);
      this.name = "InputValidationError";
    }
  },
  DatabaseConnectionError: class DatabaseConnectionError extends Error {
    constructor(message) {
      super(message);
      this.name = "DatabaseConnectionError";
    }
  },
  DatabaseError: class DatabaseError extends Error {
    constructor(message) {
      super(message);
      this.name = "DatabaseError";
    }
  },
}));

// ───────────────────────────────────────────────
// 2️⃣ Import Controller & Utilities After Mocks
// ───────────────────────────────────────────────
import fulfillOrder from "../../cart/fulfillOrders.js";
import { pingDatabase, setOrderStatusInDB } from "../../../database/utils.js";

// ───────────────────────────────────────────────
// 3️⃣ Set Up Express App & Simulate Session
// ───────────────────────────────────────────────
const app = express();
app.use(express.json());
// Middleware to simulate session from header "x-session-user"
app.use((req, res, next) => {
  const userHeader = req.headers["x-session-user"];
  if (userHeader) {
    try {
      req.session = { user: JSON.parse(userHeader) };
    } catch (err) {
      req.session = {};
    }
  } else {
    req.session = {};
  }
  next();
});
// Register route. Use an optional route parameter to test missing orderId.
app.patch("/cart/fulfillOrders{/:orderId}", (req, res) => fulfillOrder(req, res));

// ───────────────────────────────────────────────
// 4️⃣ Write the Tests
// ───────────────────────────────────────────────
describe("PATCH /cart/fulfillOrders/:orderId - fulfillOrder API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    // No session header provided.
    const response = await request(app)
      .patch("/cart/fulfillOrders/123")
      .send();
    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Unauthorized: Please log in");
  });

  it("should return 403 if user is not an Admin", async () => {
    const nonAdminUser = { username: "user1", category: "Regular" };
    const response = await request(app)
      .patch("/cart/fulfillOrders/123")
      .set("x-session-user", JSON.stringify(nonAdminUser))
      .send();
    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Forbidden: Admin access required");
  });

  it("should return 400 if orderId parameter is missing", async () => {
    const adminUser = { username: "admin1", category: "Admin" };
    const response = await request(app)
      .patch("/cart/fulfillOrders/") // Missing orderId
      .set("x-session-user", JSON.stringify(adminUser))
      .send();
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Missing parameter: orderId.");
  });

  it("should return 200 if order is fulfilled successfully", async () => {
    const adminUser = { username: "admin1", category: "Admin" };
    // Simulate successful DB ping and status update.
    pingDatabase.mockResolvedValue();
    setOrderStatusInDB.mockResolvedValue();

    const response = await request(app)
      .patch("/cart/fulfillOrders/123")
      .set("x-session-user", JSON.stringify(adminUser))
      .send();
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Order marked as Completed!");
    expect(setOrderStatusInDB).toHaveBeenCalledWith("123", "Completed");
  });
});
