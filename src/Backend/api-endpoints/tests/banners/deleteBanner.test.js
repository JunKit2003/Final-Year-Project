import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import express from "express";
import { join } from "path";

// 1️⃣ Mock dependencies **BEFORE** importing `deleteBanner.js`
vi.mock("fs/promises", () => ({
  unlink: vi.fn().mockResolvedValue(),
  access: vi.fn().mockResolvedValue(), // Assume file exists unless explicitly rejected
}));

vi.mock("../../../database/utils.js", () => ({
  getBannerById: vi.fn(),
  deleteBannerFromDB: vi.fn(),
  InputValidationError: class InputValidationError extends Error {},
  DatabaseConnectionError: class DatabaseConnectionError extends Error {},
  BannerNotFoundError: class BannerNotFoundError extends Error {},
}));

// 2️⃣ Import modules **AFTER** mocks
import { db } from "../../../database/index.js"; // Adjust path if needed
import deleteBanner from "../../banners/deleteBanner.js"; // Adjust path if needed
import { getBannerById, deleteBannerFromDB } from "../../../database/utils.js";
import { unlink, access } from "fs/promises";

// 3️⃣ Setup Express app
const app = express();
app.use(express.json());
app.delete("/deleteBanner/:id", (req, res) => deleteBanner(req, res));

// 4️⃣ Ensure database is ready before running tests
beforeAll(async () => {
  await db.sequelize.authenticate();
  await db.sequelize.sync({ force: false });
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("Delete Banner API Tests", () => {
  it("should return 409 if the banner does not exist", async () => {
    getBannerById.mockResolvedValue(null); // Simulating a banner not found

    const response = await request(app).delete("/deleteBanner/99");

    expect(response.statusCode).toBe(409);
    expect(response.body).toHaveProperty("message", "Banner with id 99 not found!");
  });

  it("should return 200 on successful banner deletion", async () => {
    getBannerById.mockResolvedValue({ id: "1", directory: "banner1.jpg" });
    deleteBannerFromDB.mockResolvedValue();
    unlink.mockResolvedValue();

    const response = await request(app).delete("/deleteBanner/1");

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("message", "Banner deleted successfully!");

    expect(deleteBannerFromDB).toHaveBeenCalledWith("1");
    expect(access).toHaveBeenCalledWith(join("images", "banner_images", "banner1.jpg"));
    expect(unlink).toHaveBeenCalledWith(join("images", "banner_images", "banner1.jpg"));
  });

  it("should return 200 if file does not exist but database entry is deleted", async () => {
    getBannerById.mockResolvedValue({ id: "2", directory: "nonexistent.jpg" });
    deleteBannerFromDB.mockResolvedValue();
    
    // Simulating a missing file scenario
    access.mockRejectedValue(
      Object.assign(new Error("File not found"), { code: "ENOENT" })
    );
  
    // 🔥 Ensure unlink is cleared before test execution
    unlink.mockClear();
  
    const response = await request(app).delete("/deleteBanner/2");
  
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("message", "Banner deleted successfully!");
  
    expect(deleteBannerFromDB).toHaveBeenCalledWith("2");
    expect(access).toHaveBeenCalledWith(join("images", "banner_images", "nonexistent.jpg"));
    
    // 🔥 Ensure unlink is NOT called
    expect(unlink).not.toHaveBeenCalled();
  });
  
  

});
