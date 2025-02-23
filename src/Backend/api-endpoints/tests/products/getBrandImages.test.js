// tests/getBrandImages.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";

// 1️⃣ Mock database utils BEFORE importing the controller
vi.mock("../../../database/utils.js", () => ({
  DatabaseConnectionError: class DatabaseConnectionError extends Error {},
  getBrandImagesFromDB: vi.fn(),
}));

// 2️⃣ Import the controller and the mock
import { getBrandImagesFromDB } from "../../../database/utils.js";
import getBrandImages from "../../products/getBrandImages.js"; // Adjust the path

// 3️⃣ Create a minimal Express app
const app = express();
app.use(express.json());

// Example route: GET /api/brands/images
app.get("/api/products/images", (req, res) => getBrandImages(req, res));

describe("GET /api/products/images", () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  it("should return 200 and the brand images", async () => {
    // Mock the DB function to return some brand images
    getBrandImagesFromDB.mockResolvedValue([
      { id: 1, name: "Brand A", imagePath: "brandA.png" },
      { id: 2, name: "Brand B", imagePath: "brandB.jpg" },
    ]);

    const response = await request(app).get("/api/products/images");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty(
      "message",
      "Brand images retrieved successfully!"
    );
    expect(response.body).toHaveProperty("brands");
    expect(response.body.brands.length).toBe(2);

    // Check that each brand has the expected imageUrl
    const [brandA, brandB] = response.body.brands;
    expect(brandA).toMatchObject({
      id: 1,
      name: "Brand A",
      imagePath: "brandA.png",
      imageUrl: "/images/brand_images/brandA.png",
    });
    expect(brandB).toMatchObject({
      id: 2,
      name: "Brand B",
      imagePath: "brandB.jpg",
      imageUrl: "/images/brand_images/brandB.jpg",
    });

    // Ensure the DB function was called
    expect(getBrandImagesFromDB).toHaveBeenCalled();
  });

  it("should return 200 with an empty array if no brand images", async () => {
    // Mock returning an empty list
    getBrandImagesFromDB.mockResolvedValue([]);

    const response = await request(app).get("/api/products/images");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty(
      "message",
      "Brand images retrieved successfully!"
    );
    expect(response.body.brands).toEqual([]);
  });

  // We ignore 500-related tests (DatabaseConnectionError, etc.) per instructions.
});
