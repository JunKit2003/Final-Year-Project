// tests/addProduct.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";

// 1️⃣ Mock the database and file-uploads utils BEFORE importing addProduct
vi.mock("../../../database/utils.js", () => ({
  pingDatabase: vi.fn(),
  DatabaseConnectionError: class DatabaseConnectionError extends Error {},
  InputValidationError: class InputValidationError extends Error {},
  ProductExistsError: class ProductExistsError extends Error {},
  addProductToDB: vi.fn(),
  addVariationsToDB: vi.fn(),
}));

vi.mock("../../file-uploads/utils.js", () => ({
  reconstructImagesData: vi.fn(),
}));

vi.mock("../../file-uploads/uploadProductImages.js", () => ({
  __esModule: true,
  default: vi.fn(),
}));

// 2️⃣ Import AFTER mocks
import {
  pingDatabase,
  InputValidationError,
  ProductExistsError,
  addProductToDB,
  addVariationsToDB,
} from "../../../database/utils.js";
import { reconstructImagesData } from "../../file-uploads/utils.js";
import uploadProductImages from "../../file-uploads/uploadProductImages.js";
import addProduct from "../../products/addProduct.js"; // Adjust path as needed

// 3️⃣ Setup a minimal Express app
const app = express();
app.use(express.json());

// Suppose your route is POST /api/products/add
app.post("/api/products/add", (req, res) => addProduct(req, res));

// 4️⃣ Tests
describe("POST /api/products/add", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 if 'variations' is invalid JSON", async () => {
    // Mock DB ping
    pingDatabase.mockResolvedValue();

    // Send invalid JSON for variations (it'll fail JSON.parse)
    const res = await request(app)
      .post("/api/products/add")
      .send({
        variations: "{ invalid JSON }",
        hasImageChanges: "false",
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Invalid variations format.");
  });

  it("should return 400 if 'variations' is not an array", async () => {
    pingDatabase.mockResolvedValue();

    const res = await request(app)
      .post("/api/products/add")
      .send({
        variations: {},
        hasImageChanges: "false",
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message", "Variations must be an array.");
  });

  it("should return 409 if product already exists (ProductExistsError)", async () => {
    pingDatabase.mockResolvedValue();

    // Simulate your DB throwing a ProductExistsError
    addProductToDB.mockRejectedValue(new ProductExistsError("Product already exists!"));

    const res = await request(app)
      .post("/api/products/add")
      .send({
        variations: [],
        hasImageChanges: "false",
      });

    expect(res.statusCode).toBe(409);
    expect(res.body).toHaveProperty("message", "Product already exists!");
  });

  it("should return 201 and NOT call addVariationsToDB if variations is empty", async () => {
    pingDatabase.mockResolvedValue();
    addProductToDB.mockResolvedValue({ id: 123 });
  
    const res = await request(app)
      .post("/api/products/add")
      .send({
        variations: [],
        hasImageChanges: "false",
      });
  
    expect(res.statusCode).toBe(201);
    expect(addVariationsToDB).not.toHaveBeenCalled();
  });
  
  it("should return 201 and call addVariationsToDB if variations are present", async () => {
    pingDatabase.mockResolvedValue();
    addProductToDB.mockResolvedValue({ id: 123 });
  
    const variationsPayload = [
      { size: "M", color: "Blue", price: 19.99 },
      { size: "L", color: "Red", price: 24.99 },
    ];
  
    const res = await request(app)
      .post("/api/products/add")
      .send({
        variations: variationsPayload,
        hasImageChanges: "false",
      });
  
    expect(res.statusCode).toBe(201);
    // Expect it was called with the variations (plus productId, if your code modifies them)
    expect(addVariationsToDB).toHaveBeenCalled();
  });
  

  // We ignore 500-related tests per your instructions.
});
