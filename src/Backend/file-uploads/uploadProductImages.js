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

async function deleteAllFilesInDirectory(directory) {
	const readdir = promisify(fs.readdir);
	const stat = promisify(fs.stat);
	const unlink = promisify(fs.unlink);
	const rmdir = promisify(fs.rmdir);

	const items = await readdir(directory);
	for (const item of items) {
		const fullPath = join(directory, item);
		const itemStat = await stat(fullPath);

		if (itemStat.isDirectory()) {
			// Recursively delete directory contents
			await deleteAllFilesInDirectory(fullPath);
			await rmdir(fullPath);
		} else {
			// Delete file
			await unlink(fullPath);
		}
	}
}

export default async function uploadProductImages(productName, imagesData) {
	try {
		// Create the base directory for the product's images
		const baseDirectory = join(
			"images",
			"product_images",
			productName.toString()
		);

		if (
			!imagesData ||
			imagesData == {} ||
			!Object.keys(imagesData).length
		) {
			// Delete all existing files in the base directory
			await deleteAllFilesInDirectory(baseDirectory);
			//throw new Error("Invalid or missing image data!");
		}

		// Ensure the base directory exists
		ensureDirectoryExists(baseDirectory);

		// Delete all existing files in the base directory
		await deleteAllFilesInDirectory(baseDirectory);

		// For each color in imagesData
		for (const [color, { files, names }] of Object.entries(imagesData)) {
			if (files.length !== names.length) {
				throw new Error(
					`Mismatch between files and names for color: ${color}`
				);
			}

			// Create a subdirectory for each color
			const colorDirectory = join(baseDirectory, color);
			ensureDirectoryExists(colorDirectory);

			// Save each file for this color
			for (let i = 0; i < files.length; i++) {
				const file = files[i];
				let fileName = names[i];

				// Extract the original file extension
				const originalExtension = extname(
					file.originalname
				).toLowerCase();

				// Check if the original file extension is a valid image extension
				if (!hasValidImageExtension(file.originalname)) {
					console.log(
						`Skipping file: ${file.originalname}, not a valid image extension.`
					);
					continue; // Skip files that don't have a valid image extension
				}

				// Check if the fileName already has a valid image extension
				if (!hasValidImageExtension(fileName)) {
					// If no valid extension in the fileName, add the original extension or default to `.png`
					const extensionToUse = originalExtension || ".png";
					fileName = `${fileName}${extensionToUse}`;
				}

				const filePath = join(colorDirectory, fileName);

				// Save the file to disk
				await writeFile(filePath, file.buffer); // Assuming file.buffer contains the file data

				console.log(`File saved: ${filePath}`);
			}
		}

		// Return the base directory where all images are saved
		return baseDirectory;
	} catch (error) {
		console.error("Error saving images:", error);
		throw new Error("Image upload failed.");
	}
}
