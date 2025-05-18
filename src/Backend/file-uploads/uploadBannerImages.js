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

export default async function uploadBannerImages(imagesData) {
	try {
		const baseDirectory = join("images", "banner_images");
		ensureDirectoryExists(baseDirectory);

		// Store the filenames of saved images
		const savedImageFilenames = [];

		// Process each file in imagesData
		for (const { file, name } of imagesData) {
			// Validate the image file
			if (!file || !hasValidImageExtension(file.originalname)) {
				console.log(`Skipping file: ${file.originalname}, not a valid image extension.`);
				continue; // Skip files that don't have a valid image extension
			}

			const originalExtension = extname(file.originalname).toLowerCase();
			let fileName = name;

			if (!hasValidImageExtension(fileName)) {
				const extensionToUse = originalExtension || ".png";
				fileName = `${fileName}${extensionToUse}`;
			}

			const filePath = join(baseDirectory, fileName);

			// Save the file to disk
			await writeFile(filePath, file.buffer);

			console.log(`File saved: ${filePath}`);

			// Add only the filename to the array (not the full path)
			savedImageFilenames.push(fileName);
		}

		// Return the array of saved image filenames
		return savedImageFilenames;
	} catch (error) {
		console.error("Error saving banner images:", error);
		throw new Error("Banner image upload failed.");
	}
}
