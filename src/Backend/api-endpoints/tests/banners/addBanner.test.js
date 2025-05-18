import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import express from "express";
import multer from "multer";

// 🔥 1️⃣ Mock dependencies **BEFORE** importing `addBanner.js`
vi.mock("../../../file-uploads/uploadBannerImages.js", () => ({
  default: vi.fn(),
}));

vi.mock("../../../database/utils.js", () => ({
  pingDatabase: vi.fn(),
  addBannerToDB: vi.fn(),
  InputValidationError: class InputValidationError extends Error {},
  DatabaseConnectionError: class DatabaseConnectionError extends Error {},
}));

// 2️⃣ Import modules **AFTER** mocks
import { db } from "../../../database/index.js"; // Adjust path if needed
import addBanner from "../../banners/addBanner.js"; // Adjust path if needed
import uploadBannerImages from "../../../file-uploads/uploadBannerImages.js";
import { addBannerToDB, InputValidationError } from "../../../database/utils.js";

// 3️⃣ Setup Express app with Multer
const app = express();
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.use(express.json());
app.post("/addBanner", upload.array("images"), (req, res) => addBanner(req, res));

// 🔄 Database setup (optional)
beforeAll(async () => {
  await db.sequelize.sync({ force: false });
});
afterAll(async () => {
  await db.sequelize.close();
});

describe("Add Banner API Tests", () => {
  it("should return 400 if no images are uploaded", async () => {
    const response = await request(app).post("/addBanner").send();

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("message", "No images uploaded.");
  });

  it("should return 201 on successful banner upload", async () => {
    uploadBannerImages.mockResolvedValue(["banner1.jpg", "banner2.jpg"]);
    addBannerToDB.mockResolvedValue();

    const response = await request(app)
      .post("/addBanner")
      .attach("images", Buffer.from("fake-image-content"), "test1.jpg")
      .attach("images", Buffer.from("fake-image-content"), "test2.jpg");

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty("message", "Banners added successfully!");

    // Ensure images were uploaded and stored in DB
    expect(uploadBannerImages).toHaveBeenCalledTimes(1);
    expect(addBannerToDB).toHaveBeenCalledTimes(2);
  });
});
