import {
  DatabaseConnectionError,
  ProductNotFoundError,
  getProductsFromDB,
  getProductFromDB,
} from "../../database/utils.js";

import { mediaForVariations } from "../../features/media/service.js";

// Retrieve all products or a single product
export default async function getProducts(req, res) {
  try {
    const { productId } = req.body;

    if (productId) {
      // Fetch the single product along with its variations
      const product = await getProductFromDB(productId);

      if (!product) {
        throw new ProductNotFoundError(
          `Product with id ${productId} not found.`
        );
      }

      // Attach images to the product's variations
      const productWithImages = await attachImagesToProduct(product);
      // console.log("Product with Images:", productWithImages);

      res.status(200).send({
        message: "Product retrieved successfully!",
        product: productWithImages,
      });
    } else {
      // Retrieve all products along with their variations
      const products = await getProductsFromDB();

      // Loop through each product and attach images
      const productsWithImages = await Promise.all(
        products.map(async (product) => await attachImagesToProduct(product))
      );

      // console.log("Products with Images:", productsWithImages);

      res.status(200).send({
        message: "Products retrieved successfully!",
        products: productsWithImages,
      });
    }
  } catch (error) {
    if (error instanceof ProductNotFoundError) {
      res.status(404).send({ message: error.message });
    } else if (error instanceof DatabaseConnectionError) {
      res.status(500).json({ message: "Unable to connect to the database!" });
    } else {
      console.error("Error retrieving products: ", error);
      res.status(500).send({ message: "Internal server error", error });
    }
  }
}

// Attach photos (from product_media) to each variation, in display order.
// Shape kept from the old SKU-folder version: variation.images = { files: [url], names: [] }.
export async function attachImagesToProduct(product) {
  if (!product.variations || product.variations.length === 0) return product;
  const media = await mediaForVariations(product.variations.map((v) => v.id));
  product.variations = product.variations.map((variation) => {
    const list = media.get(variation.id) || [];
    variation.images = { files: list.map((m) => m.url), names: list.map((m) => String(m.id)) };
    return variation;
  });
  return product;
}
