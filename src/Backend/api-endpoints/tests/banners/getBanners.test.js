import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import express from "express";

// 1️⃣ Mock dependencies **BEFORE** importing `getBanners.js`
vi.mock("../../../database/utils.js", () => ({
  getBannersFromDB: vi.fn(),
  DatabaseConnectionError: class DatabaseConnectionError extends Error {},
  BannerNotFoundError: class BannerNotFoundError extends Error {},
}));

vi.mock("../../../file-uploads/utils.js", () => ({
  formatImageFolderPath: vi.fn((dir) => `/formatted/path/${dir}`),
  getImageUrlDataForBanner: vi.fn(() =>
    Promise.resolve({ additionalData: "test-image-data" })
  ),
}));

// 2️⃣ Import modules **AFTER** mocks
import { db } from "../../../database/index.js"; // Ensure correct path
import getBanners from "../../banners/getBanners.js"; // Adjust path if needed
import { getBannersFromDB, BannerNotFoundError } from "../../../database/utils.js";

// 3️⃣ Setup Express app
const app = express();
app.use(express.json());
app.get("/getBanners", (req, res) => getBanners(req, res));

// 4️⃣ Ensure database is ready before running tests
beforeAll(async () => {
  await db.sequelize.authenticate();
  await db.sequelize.sync({ force: false });
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("Get Banners API Tests", () => {
  it("should return 200 with banners when banners exist", async () => {
    getBannersFromDB.mockResolvedValue([
      { id: 1, directory: "banner1.jpg", colors: ["red", "blue"] },
      { id: 2, directory: "banner2.jpg", colors: [] },
    ]);

    const response = await request(app).get("/getBanners");

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("message", "Banners retrieved successfully!");
    expect(response.body).toHaveProperty("banners");

    expect(response.body.banners.length).toBe(2);
    expect(response.body.banners[0]).toHaveProperty("imageUrl", "/images/banner_images/banner1.jpg");
    expect(response.body.banners[1]).toHaveProperty("imageUrl", "/images/banner_images/banner2.jpg");
  });

  it("should return 404 if no banners are found", async () => {
    getBannersFromDB.mockRejectedValue(new BannerNotFoundError("No banners found"));

    const response = await request(app).get("/getBanners");

    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty("message", "No banners found");
  });
});
