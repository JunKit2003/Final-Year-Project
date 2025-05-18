import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import express from "express";

// 1️⃣ **Mock dependencies BEFORE importing `addToCart.js`**
vi.mock("../../../database/utils.js", () => ({
  pingDatabase: vi.fn(),
  addCartItemToDB: vi.fn(),
  InputValidationError: class InputValidationError extends Error {},
  DatabaseConnectionError: class DatabaseConnectionError extends Error {},
}));

// 2️⃣ **Import modules AFTER mocks**
import { db } from "../../../database/index.js"; // Adjust path if needed
import addToCart from "../../cart/addToCart.js"; // Adjust path if needed
import { pingDatabase, addCartItemToDB, InputValidationError } from "../../../database/utils.js";

// 3️⃣ **Setup Express app**
const app = express();
app.use(express.json());
app.post("/addToCart", (req, res) => addToCart(req, res));

// 4️⃣ **Ensure database is ready before running tests**
beforeAll(async () => {
  await db.sequelize.authenticate();
  await db.sequelize.sync({ force: false });
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("Add to Cart API Tests", () => {
  it("should return 400 if required fields are missing", async () => {
    const response = await request(app).post("/addToCart").send({});

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty(
      "message",
      "Missing required fields: user_id, variation_id, or quantity."
    );
  });

  it("should return 201 on successful addition to cart", async () => {
    pingDatabase.mockResolvedValue();
    addCartItemToDB.mockResolvedValue();

    const response = await request(app).post("/addToCart").send({
      user_id: 1,
      variation_id: 101,
      quantity: 2,
    });

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty(
      "message",
      "Item added to cart successfully!"
    );

    expect(addCartItemToDB).toHaveBeenCalledWith(1, 101, 2);
  });

  it("should return 400 if quantity is not provided", async () => {
    const response = await request(app).post("/addToCart").send({
      user_id: 1,
      variation_id: 101,
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty(
      "message",
      "Missing required fields: user_id, variation_id, or quantity."
    );
  });

  it("should return 400 if variation_id is not provided", async () => {
    const response = await request(app).post("/addToCart").send({
      user_id: 1,
      quantity: 2,
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty(
      "message",
      "Missing required fields: user_id, variation_id, or quantity."
    );
  });

  it("should return 400 if user_id is not provided", async () => {
    const response = await request(app).post("/addToCart").send({
      variation_id: 101,
      quantity: 2,
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty(
      "message",
      "Missing required fields: user_id, variation_id, or quantity."
    );
  });
});
