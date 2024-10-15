import {
	pingDatabase,
	DatabaseConnectionError,
	InputValidationError,
	ProductExistsError,
	addProductToDB,
} from "../../database/utils.js";

import { reconstructImagesData } from "../../file-uploads/utils.js";
import uploadProductImages from "../../file-uploads/uploadProductImages.js";

// Add a new product
export default async function addProduct(req, res) {
	try {
		const productDetails = req.body;

		await pingDatabase();

		let image_folder_path = 'N/A';

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
			image_folder_path = await uploadProductImages(
				productDetails.name,
				imagesData
			);
		}

		// Update the product details with the new image folder path
		productDetails.image_folder_path = image_folder_path;

		// Log product details to be added
		console.log("Product details being sent to the database:", productDetails);

		await addProductToDB(productDetails);

		res.status(201).send({ message: "Product added successfully!" });
	} catch (error) {
		if (error instanceof InputValidationError || SyntaxError) {
			return res.status(400).json({ message: error.message });
		} else if (error instanceof ProductExistsError) {
			return res.status(409).json({ message: error.message });
		} else if (error instanceof DatabaseConnectionError) {
			return res
				.status(500)
				.json({ message: "Unable to connect to the database!" });
		} else {
			console.error("Error adding product: ", error);
			res.status(500).send({ message: "Internal server error: ", error });
		}
	}
}

