// tests/getProductsCategories.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";

// 1️⃣ Mock out database utils BEFORE importing the controller
vi.mock("../../../database/utils.js", () => ({
  DatabaseConnectionError: class DatabaseConnectionError extends Error {},
  getProductsCategoryFromDB: vi.fn(),
}));

// 2️⃣ Import AFTER mocks
import {
  getProductsCategoryFromDB,
  DatabaseConnectionError,
} from "../../../database/utils.js";
import getProductsCategories from "../../products/getProductCategories.js"; 
// Adjust the path above to match your folder structure

// 3️⃣ Create a minimal Express app for testing
const app = express();
app.use(express.json());

// Suppose your route is GET /api/products/categories
app.get("/api/products/categories", (req, res) => getProductsCategories(req, res));

describe("GET /api/products/categories", () => {
  beforeEach(() => {
    // Reset all mocks before each test so there's no cross-contamination
    vi.clearAllMocks();
  });

  it("should return 404 if no categories are found", async () => {
    // Mock the DB call to return an empty array
    getProductsCategoryFromDB.mockResolvedValue([]);

    const response = await request(app).get("/api/products/categories");

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("message", "No categories found.");
  });

  it("should return 200 and the categories if they exist", async () => {
    // Mock the DB call to return a non-empty array
    getProductsCategoryFromDB.mockResolvedValue(["Electronics", "Clothing", "Home"]);

    const response = await request(app).get("/api/products/categories");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty(
      "message",
      "Product categories retrieved successfully!"
    );
    expect(response.body).toHaveProperty("categories");
    expect(response.body.categories).toEqual(["Electronics", "Clothing", "Home"]);
  });

  // We ignore any 500-related tests (e.g. DatabaseConnectionError) per your instruction.
});
