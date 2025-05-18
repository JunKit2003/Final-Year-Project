import fs from "fs";
import { extname, join } from "path";
import { promisify } from "util";

import { hasValidImageExtension } from "./utils.js";

const writeFile = promisify(fs.writeFile);

function ensureDirectoryExists(directory) {
	if (!fs.existsSync(directory)) {
		fs.mkdirSync(directory, { recursive: true });
	}
}

export default async function uploadBrandImage(id, file) {
	try {
		// Ensure the directory exists
		const baseDirectory = join("images", "brand_images");
		ensureDirectoryExists(baseDirectory);

		// Validate the image file
		if (!file || !hasValidImageExtension(file.originalname)) {
			console.log(`Skipping file: ${file.originalname}, not a valid image extension.`);
			throw new Error("Invalid image file format.");
		}

		// Extract original extension
		const originalExtension = extname(file.originalname).toLowerCase();

		// Generate a unique filename using the brand ID and timestamp
		const uniqueFilename = `${id}_${Date.now()}${originalExtension}`;
		const filePath = join(baseDirectory, uniqueFilename);

		// Save the file to disk
		await writeFile(filePath, file.buffer);

		console.log(`Brand image saved: ${filePath}`);

		// Return only the filename (e.g., "12345_1678901234.jpg")
		return uniqueFilename;
	} catch (error) {
		console.error("Error uploading brand image:", error);
		throw new Error("Brand image upload failed.");
	}
}
