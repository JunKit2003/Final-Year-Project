// tests/updateProduct.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";

// 1️⃣ Mock relevant dependencies BEFORE importing `updateProduct`
vi.mock("../../../database/utils.js", () => ({
  pingDatabase: vi.fn(), // if you need it, though your code doesn't actually use it
  DatabaseConnectionError: class DatabaseConnectionError extends Error {},
  InputValidationError: class InputValidationError extends Error {},
  ProductNotFoundError: class ProductNotFoundError extends Error {},
  updateProductToDB: vi.fn(),
  updateVariationsToDB: vi.fn(),
}));

vi.mock("../../../file-uploads/utils.js", () => ({
  reconstructImagesData: vi.fn(),
}));

vi.mock("../../../file-uploads/uploadProductImages.js", () => ({
  __esModule: true,
  default: vi.fn(),
}));

// 2️⃣ Import AFTER mocks
import {
  updateProductToDB,
  updateVariationsToDB,
} from "../../../database/utils.js";
import { reconstructImagesData } from "../../../file-uploads/utils.js";
import uploadProductImages from "../../../file-uploads/uploadProductImages.js";
import updateProduct from "../../products/updateProduct.js"; // Adjust path

// 3️⃣ Create an Express app and define a route
const app = express();
app.use(express.json());

// Simulate file uploads by copying req.body.files to req.files
app.put("/api/products/:id", (req, res) => {
  if (req.body.files) {
    req.files = req.body.files;
    delete req.body.files;
  }
  updateProduct(req, res);
});

describe("PUT /api/products/:id - updateProduct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 if `variations` is invalid JSON (string parse error)", async () => {
    // Send a string that is not valid JSON
    const invalidVariations = "{ invalid JSON }";

    const res = await request(app)
      .put("/api/products/123")
      .send({
        variations: invalidVariations,
        hasImageChanges: "false",
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message", "Invalid variations format.");
    // Ensure updateProductToDB is never called
    expect(updateProductToDB).not.toHaveBeenCalled();
    expect(updateVariationsToDB).not.toHaveBeenCalled();
  });

  it("should return 400 if `variations` is not an array", async () => {
    // variations is an object, not an array
    const res = await request(app)
      .put("/api/products/123")
      .send({
        variations: { sku: "sku001" },
        hasImageChanges: "false",
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message", "Variations must be an array.");
    expect(updateProductToDB).not.toHaveBeenCalled();
    expect(updateVariationsToDB).not.toHaveBeenCalled();
  });

  it("should return 200 if product and variations are updated successfully (no image changes)", async () => {
    // Mock DB calls to succeed
    updateProductToDB.mockResolvedValue();
    updateVariationsToDB.mockResolvedValue();

    const res = await request(app)
      .put("/api/products/123")
      .send({
        variations: [],
        hasImageChanges: "false",
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty(
      "message",
      "Product and variations updated successfully"
    );

    // Confirm DB updates
    expect(updateProductToDB).toHaveBeenCalledWith("123", {
      hasImageChanges: "false",
      // variations was deleted inside the controller
    });
    // variations => []
    expect(updateVariationsToDB).toHaveBeenCalledWith("123", []);
    // No file uploads
    expect(reconstructImagesData).not.toHaveBeenCalled();
    expect(uploadProductImages).not.toHaveBeenCalled();
  });

  it("should return 200 if product has image changes and updates successfully", async () => {
    // Mock DB calls to succeed
    updateProductToDB.mockResolvedValue();
    updateVariationsToDB.mockResolvedValue();
    // Mock image reconstruction
    reconstructImagesData.mockReturnValue([
      { /* some image data structure */ },
    ]);
    // Mock file uploading
    uploadProductImages.mockResolvedValue("/some/path");

    // We'll simulate file uploading by including "files" in the JSON body.
    const res = await request(app)
      .put("/api/products/456")
      .send({
        variations: [{ sku: "sku001" }],
        hasImageChanges: "true",
        // Simulated file upload data; note these will be moved to req.files by our route middleware.
        files: [{ filename: "mockFile.png", originalname: "mockFile.png" }],
        names: ["ImageName"],
        keys: ["sku001"],
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty(
      "message",
      "Product and variations updated successfully"
    );

    // The controller calls reconstructImagesData(files, names, keys)
    expect(reconstructImagesData).toHaveBeenCalledWith(
      [{ filename: "mockFile.png", originalname: "mockFile.png" }],
      ["ImageName"],
      ["sku001"]
    );
    // Then calls uploadProductImages(productId, imagesData)
    expect(uploadProductImages).toHaveBeenCalledWith("456", [
      { /* some image data structure */ },
    ]);

    // The productDetails object gets "image_folder_path" = "/some/path"
    // then calls updateProductToDB and updateVariationsToDB.
    // Note: we no longer expect a "files" property.
    expect(updateProductToDB).toHaveBeenCalledWith("456", {
      hasImageChanges: "true",
      names: ["ImageName"],
      keys: ["sku001"],
      image_folder_path: "/some/path",
    });

    // The variation(s) is updated with productId = "456" and the image_folder_path
    expect(updateVariationsToDB).toHaveBeenCalledWith("456", [
      {
        sku: "sku001",
        productId: "456",
        image_folder_path: "/some/path",
      },
    ]);
  });

  // We ignore 500-related tests (server errors) as requested.
});
