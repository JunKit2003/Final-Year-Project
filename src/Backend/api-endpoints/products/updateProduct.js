import {
	pingDatabase,
	DatabaseConnectionError,
	InputValidationError,
	ProductNotFoundError,
	updateProductToDB,
} from "../../database/utils.js";

import { reconstructImagesData } from "../../file-uploads/utils.js";
import uploadProductImages from "../../file-uploads/uploadProductImages.js";

// Update a product
export default async function updateProduct(req, res) {
	try {
		const { id } = req.params;
		const productDetails = req.body;

		await pingDatabase();

		// If there are image changes, process the uploaded images
		if (productDetails.hasImageChanges === "true") {
			// Reconstruct Images Data
			const files = req.files; // Multer stores files here
			// Ensure `names` is an array
			const names = Array.isArray(req.body.names)
				? req.body.names
				: [req.body.names];

			// Ensure `keys` is an array
			const keys = Array.isArray(req.body.keys)
				? req.body.keys
				: [req.body.keys];

			const imagesData = reconstructImagesData(files, names, keys);

			// Save images and get folder path
			const image_folder_path = await uploadProductImages(
				productDetails.name,
				imagesData
			);

			// Update the product details with the new image folder path
			productDetails.image_folder_path = image_folder_path;

			await updateProductToDB(id, productDetails);
		} else {
			await updateProductToDB(id, productDetails);
		}

		res.status(200).send({ message: "Product updated successfully" });
	} catch (error) {
		if (error instanceof InputValidationError || SyntaxError) {
			return res.status(400).json({ message: error.message });
		} else if (error instanceof ProductNotFoundError) {
			return res.status(409).json({ message: error.message });
		} else if (error instanceof DatabaseConnectionError) {
			return res
				.status(500)
				.json({ message: "Unable to connect to the database!" });
		} else {
			console.error("Error updating product: ", error);
			res.status(500).send({ message: "Internal server error: ", error });
		}
	}
}
