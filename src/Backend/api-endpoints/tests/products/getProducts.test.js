// tests/getProducts.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";

// 1️⃣ Mock out database and file-upload utils BEFORE importing the controller
vi.mock("../../../database/utils.js", () => ({
  // Mocked Error Classes
  DatabaseConnectionError: class DatabaseConnectionError extends Error {},
  ProductNotFoundError: class ProductNotFoundError extends Error {},

  // Mocked DB functions
  getProductsFromDB: vi.fn(),
  getProductFromDB: vi.fn(),
}));

vi.mock("../../../file-uploads/utils.js", () => ({
  getImageUrlDataForProduct: vi.fn(),
}));

// 2️⃣ Import AFTER mocks
import {
  getProductsFromDB,
  getProductFromDB,
  ProductNotFoundError,
  DatabaseConnectionError,
} from "../../../database/utils.js";
import { getImageUrlDataForProduct } from "../../../file-uploads/utils.js";

import getProducts from "../../products/getProducts.js"; // Adjust path if needed

// 3️⃣ Create a minimal Express app for testing
const app = express();
app.use(express.json());

// We'll assume the route is POST /api/products
app.post("/api/products", (req, res) => getProducts(req, res));

describe("POST /api/products", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 404 if a single product is requested but not found", async () => {
    // Arrange
    getProductFromDB.mockResolvedValue(null); // product not found

    // Act
    const res = await request(app)
      .post("/api/products")
      .send({ productId: "nonexistent-product-id" });

    // Assert
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty(
      "message",
      "Product with id nonexistent-product-id not found."
    );
  });

  it("should return 200 and a single product (with images attached) when productId is provided", async () => {
    // Arrange
    const mockProduct = {
      id: "123",
      name: "Mock Product",
      variations: [
        { sku: "SKU-1", color: "Red" },
        { sku: "SKU-2", color: "Blue" },
      ],
    };
    // Mock DB response
    getProductFromDB.mockResolvedValue(mockProduct);

    // Mock image data
    const mockImageData = {
      "SKU-1": { files: ["red-1.jpg"], names: ["red-1"] },
      "SKU-2": { files: ["blue-1.jpg"], names: ["blue-1"] },
    };
    getImageUrlDataForProduct.mockResolvedValue(mockImageData);

    // Act
    const res = await request(app)
      .post("/api/products")
      .send({ productId: "123" });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "Product retrieved successfully!");
    expect(res.body).toHaveProperty("product");
    const { product } = res.body;
    expect(product.id).toBe("123");
    expect(product.variations.length).toBe(2);
    expect(product.variations[0]).toMatchObject({
      sku: "SKU-1",
      images: { files: ["red-1.jpg"], names: ["red-1"] },
    });
    expect(product.variations[1]).toMatchObject({
      sku: "SKU-2",
      images: { files: ["blue-1.jpg"], names: ["blue-1"] },
    });
  });

  it("should return 200 and all products (with images) if productId is not provided", async () => {
    // Arrange
    const mockProducts = [
      {
        id: "p1",
        name: "Product 1",
        variations: [{ sku: "SKU-P1-A" }, { sku: "SKU-P1-B" }],
      },
      {
        id: "p2",
        name: "Product 2",
        variations: [{ sku: "SKU-P2-A" }],
      },
    ];
    getProductsFromDB.mockResolvedValue(mockProducts);

    // For images, we'll just simulate the same data for each variation
    getImageUrlDataForProduct.mockImplementation(async (productId, skus) => {
      const data = {};
      skus.forEach((sku) => {
        data[sku] = {
          files: [`${sku}-image.jpg`],
          names: [`${sku}-image`],
        };
      });
      return data;
    });

    // Act
    const res = await request(app).post("/api/products").send({});

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "Products retrieved successfully!");
    expect(res.body).toHaveProperty("products");
    expect(res.body.products.length).toBe(2);

    // Check images got attached
    const [product1, product2] = res.body.products;
    expect(product1.variations[0].images).toEqual({
      files: ["SKU-P1-A-image.jpg"],
      names: ["SKU-P1-A-image"],
    });
    expect(product1.variations[1].images).toEqual({
      files: ["SKU-P1-B-image.jpg"],
      names: ["SKU-P1-B-image"],
    });
    expect(product2.variations[0].images).toEqual({
      files: ["SKU-P2-A-image.jpg"],
      names: ["SKU-P2-A-image"],
    });
  });

  // We ignore 500-related tests (database errors, etc.) per your request.
});
