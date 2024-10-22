import {
    DatabaseConnectionError,
    ProductNotFoundError,
    getProductsFromDB,
    getProductFromDB, // Function to retrieve a single product
} from "../../database/utils.js";

import {
    formatImageFolderPath,
    getImageUrlData,
} from "../../file-uploads/utils.js";

// Retrieve all products
export default async function getProducts(req, res) {
    try {
        // Check if productId is provided in the request body
        const { productId } = req.body;

        // If productId is provided, fetch the single product
        if (productId) {
            const product = await getProductFromDB(productId); // Function to get a single product

            // Check if the product has a valid image folder path
            if (
                product.image_folder_path &&
                product.image_folder_path !== "N/A"
            ) {
                const formattedImageFolderPath = formatImageFolderPath(
                    product.image_folder_path
                );

                // Generate imagesData for the product
                product.imagesData = await getImageUrlData(
                    formattedImageFolderPath,
                    product.colors
                );
            } else {
                product.imagesData = {}; // If no image folder path, set to empty object
            }

            // Send response with the single product
            return res.status(200).send({
                message: "Product retrieved successfully!",
                product,
            });
        }

        // Otherwise, retrieve all products
        const products = await getProductsFromDB();

        // Loop through each product and append imagesData
        const productsWithImages = await Promise.all(
            products.map(async (product) => {
                // Check if the product has a valid image folder path
                if (
                    product.image_folder_path &&
                    product.image_folder_path !== "N/A"
                ) {
                    const formattedImageFolderPath = formatImageFolderPath(
                        product.image_folder_path
                    );

                    // Generate imagesData for the product
                    product.imagesData = await getImageUrlData(
                        formattedImageFolderPath,
                        product.colors
                    );
                } else {
                    product.imagesData = {}; // If no image folder path, set to empty object
                }

                return product; // Return product with imagesData appended
            })
        );

        // Send response with products and their imagesData
        res.status(200).send({
            message: "Products retrieved successfully!",
            products: productsWithImages,
        });
    } catch (error) {
        if (error instanceof ProductNotFoundError) {
            res.status(409).send({ message: error.message });
        } else if (error instanceof DatabaseConnectionError) {
            return res
                .status(500)
                .json({ message: "Unable to connect to the database!" });
        } else {
            console.error("Error retrieving products: ", error);
            res.status(500).send({ message: "Internal server error: ", error });
        }
    }
}
