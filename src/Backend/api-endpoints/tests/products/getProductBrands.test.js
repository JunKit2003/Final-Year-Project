// tests/getProductBrands.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";

// 1️⃣ Mock out database utils BEFORE importing the controller
vi.mock("../../../database/utils.js", () => ({
  DatabaseConnectionError: class DatabaseConnectionError extends Error {},
  getProductBrandsFromDB: vi.fn(),
}));

// 2️⃣ Import AFTER mocks
import {
  getProductBrandsFromDB,
  DatabaseConnectionError,
} from "../../../database/utils.js";
import getProductBrands from "../../products/getProductBrands.js"; // Adjust path if needed

// 3️⃣ Create a minimal Express app for testing
const app = express();
app.use(express.json());

// Suppose your route is GET /api/products/brands
app.get("/api/products/brands", (req, res) => getProductBrands(req, res));

describe("GET /api/products/brands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 404 if no brands are found", async () => {
    // Mock return of an empty array or null
    getProductBrandsFromDB.mockResolvedValue([]);

    const res = await request(app).get("/api/products/brands");
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("message", "No brands found.");
  });

  it("should return 200 and the brands if they exist", async () => {
    // Mock a non-empty array of brands
    getProductBrandsFromDB.mockResolvedValue(["Apple", "Samsung", "Xiaomi"]);

    const res = await request(app).get("/api/products/brands");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "Product brands retrieved successfully!");
    expect(res.body).toHaveProperty("brands");
    expect(res.body.brands).toEqual(["Apple", "Samsung", "Xiaomi"]);
  });

  // We ignore 500-related tests (database errors, etc.) per your request.
});
