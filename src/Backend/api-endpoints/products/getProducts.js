import {
  DatabaseConnectionError,
  ProductNotFoundError,
  getProductsFromDB,
  getProductFromDB,
} from "../../database/utils.js";

import { getImageUrlDataForProduct } from "../../file-uploads/utils.js";

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

// Helper function to attach images to a product's variations
async function attachImagesToProduct(product) {
  // Ensure variations are included
  if (!product.variations || product.variations.length === 0) {
    // console.log("No variations found for product:", product);
    return product;
  }

  const productId = product.id.toString();

  // Extract SKUs from variations
  const skus = product.variations.map((variation) => variation.sku);

  // Get images data for the product's variations
  const imagesData = await getImageUrlDataForProduct(productId, skus);
  // console.log("Retrieved Images Data:", imagesData);

  // Attach images to each variation
  product.variations = product.variations.map((variation) => {
    const sku = variation.sku;
    variation.images = imagesData[sku] || { files: [], names: [] };
    // console.log(`Attached Images to SKU ${sku}:`, variation.images);
    return variation;
  });

  // console.log("Final Product with Variations and Images:", product);
  return product;
}
