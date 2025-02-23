// tests/updateBrandImage.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import path from "path";

// 1️⃣ Mock out database utils and file upload BEFORE importing the controller
vi.mock("../../../database/utils.js", () => ({
  pingDatabase: vi.fn(),
  DatabaseConnectionError: class DatabaseConnectionError extends Error {},
  InputValidationError: class InputValidationError extends Error {},
  // In our controller we assume that updateBrandImageInDB is called twice:
  // first to get the brand by ID, then to update it.
  updateBrandImageInDB: vi.fn(),
}));

vi.mock("../../../file-uploads/uploadBrandImage.js", () => ({
  __esModule: true,
  default: vi.fn(),
}));

// 2️⃣ Mock "fs/promises" for unlink
vi.mock("fs/promises", () => ({
  unlink: vi.fn(),
}));

// 3️⃣ Import after mocks
import {
  pingDatabase,
  updateBrandImageInDB,
} from "../../../database/utils.js";
import uploadBrandImage from "../../../file-uploads/uploadBrandImage.js";
import { unlink } from "fs/promises";
import updateBrandImage from "../../products/updateBrandImage.js"; // Adjust path to your actual controller

// 4️⃣ Create an Express app for testing
const app = express();
app.use(express.json());

// Since file uploads are normally processed (e.g., via multer), we simulate it by copying a property
// from req.body.files into req.files so the controller can check for it.
app.put("/brands/:id", (req, res) => {
  if (req.body.files) {
    req.files = req.body.files;
    delete req.body.files;
  }
  updateBrandImage(req, res);
});

// 5️⃣ Tests
describe("PUT /brands/:id - updateBrandImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 404 if the brand is not found on the first DB lookup", async () => {
    // Simulate pingDatabase succeeds.
    pingDatabase.mockResolvedValue();
    // First DB call (lookup) returns null → brand not found.
    updateBrandImageInDB.mockResolvedValueOnce(null);

    const res = await request(app).put("/brands/10").send({});

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("message", "Brand not found");
    // Verify that the lookup call was made with just the ID.
    expect(updateBrandImageInDB).toHaveBeenCalledWith("10");
  });

  it("should return 404 if the brand is not found on the second DB update call", async () => {
    pingDatabase.mockResolvedValue();
    // First call: lookup returns an existing brand.
    updateBrandImageInDB.mockResolvedValueOnce({
      id: 10,
      name: "Test Brand",
      imagePath: null,
    });
    // Second call: update returns null → update failed.
    updateBrandImageInDB.mockResolvedValueOnce(null);

    const res = await request(app)
      .put("/brands/10")
      .send({ name: "Updated Brand" });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("message", "Brand not found");
    // Verify the calls:
    // First call with just the ID.
    expect(updateBrandImageInDB).toHaveBeenNthCalledWith(1, "10");
    // Second call with the ID and update details.
    expect(updateBrandImageInDB).toHaveBeenNthCalledWith(2, "10", {
      name: "Updated Brand",
    });
  });

  it("should return 200 if brand is updated successfully without file upload", async () => {
    pingDatabase.mockResolvedValue();
    // First call: lookup returns an existing brand (with no image).
    updateBrandImageInDB.mockResolvedValueOnce({
      id: 10,
      name: "Test Brand",
      imagePath: null,
    });
    // Second call: update returns the updated brand.
    updateBrandImageInDB.mockResolvedValueOnce({
      id: 10,
      name: "Test Brand Updated",
      imagePath: null,
    });

    const res = await request(app).put("/brands/10").send({
      name: "Test Brand Updated",
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "Brand updated successfully");
    expect(res.body.updatedBrand).toMatchObject({
      id: 10,
      name: "Test Brand Updated",
      imagePath: null,
    });

    // No file was uploaded, so unlink and uploadBrandImage should not be called.
    expect(unlink).not.toHaveBeenCalled();
    expect(uploadBrandImage).not.toHaveBeenCalled();

    // Confirm the DB calls:
    expect(updateBrandImageInDB).toHaveBeenNthCalledWith(1, "10");
    expect(updateBrandImageInDB).toHaveBeenNthCalledWith(2, "10", {
      name: "Test Brand Updated",
    });
  });

  it("should return 200 if brand is updated successfully with a file upload", async () => {
    pingDatabase.mockResolvedValue();
    // First call: lookup returns an existing brand that has an old image.
    updateBrandImageInDB.mockResolvedValueOnce({
      id: 10,
      name: "Old Brand",
      imagePath: "oldBrand.png",
    });
    // Simulate unlink (removing the old image) succeeds.
    unlink.mockResolvedValue();
    // Mock uploadBrandImage to return the new image filename.
    uploadBrandImage.mockResolvedValue("newBrand.png");
    // Second call: update returns the updated brand with the new image.
    updateBrandImageInDB.mockResolvedValueOnce({
      id: 10,
      name: "New Brand",
      imagePath: "newBrand.png",
    });

    const brandDetails = { name: "New Brand" };
    const mockFile = { filename: "mockFile.jpg", originalname: "mockFile.jpg" };

    const res = await request(app)
      .put("/brands/10")
      .send({ ...brandDetails, files: [mockFile] });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "Brand updated successfully");
    expect(res.body.updatedBrand).toMatchObject({
      id: 10,
      name: "New Brand",
      imagePath: "newBrand.png",
    });

    // Verify that unlink was called to remove the old image.
    const oldImagePath = path.join("images", "brand_images", "oldBrand.png");
    expect(unlink).toHaveBeenCalledWith(oldImagePath);

    // Verify that uploadBrandImage was called with the brand ID, the uploaded file, and the folder path.
    expect(uploadBrandImage).toHaveBeenCalledWith(
      "10",
      mockFile,
      "images/brand_images"
    );

    // Confirm DB calls:
    expect(updateBrandImageInDB).toHaveBeenNthCalledWith(1, "10");
    expect(updateBrandImageInDB).toHaveBeenNthCalledWith(2, "10", {
      name: "New Brand",
      imagePath: "newBrand.png",
    });
  });

  // (500-related error tests are omitted per your request.)
});
