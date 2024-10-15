import fs from "fs";
import path from "path";

async function getImageUrlData(imageFolderPath, colors) {
	const imagesData = {};

	for (const color of colors) {
		const colorFolderPath = path.join(imageFolderPath, color);

		if (fs.existsSync(colorFolderPath)) {
			const files = fs.readdirSync(colorFolderPath); // Read files in the color folder

			imagesData[color] = {
				files: files.map(
					(file) =>
						`${process.env.HOST}:${process.env.PORT_SERVER}/${imageFolderPath}/${color}/${file}`
				),
				names: files, // The original file names
			};
		}
	}
	return imagesData;
}

/**
 * Reconstructs the imagesData object from the files, names, and keys.
 *
 * @param {Array} files - Array of file objects from Multer (req.files).
 * @param {Array} names - Array of corresponding names for the files.
 * @param {Array} keys - Array of corresponding keys (like colors) for each file.
 * @returns {Object} - Reconstructed imagesData with grouped files and names.
 */
function reconstructImagesData(files, names, keys) {
	const imagesData = {};

	files.forEach((file, index) => {
		const key = keys[index]; // Get the color key from the keys array
		const fileName = names[index]; // Get the corresponding name

		// If the key doesn't exist in the object, initialize it
		if (!imagesData[key]) {
			imagesData[key] = {
				files: [],
				names: [],
			};
		}

		// Push the file and its corresponding name into the arrays
		imagesData[key].files.push(file);
		imagesData[key].names.push(fileName);
	});

	return imagesData;
}

function formatImageFolderPath(path) {
	// Replace all instances of backslashes with forward slashes
	return path.replace(/\\/g, "/");
}

// Helper function to check if the file has a valid image extension
function hasValidImageExtension(fileName) {
	const validExtensions = [
		".jpg",
		".jpeg",
		".png",
		".gif",
		".bmp",
		".webp",
		".svg",
	];
	const fileExtension = path.extname(fileName).toLowerCase();
	return validExtensions.includes(fileExtension);
}

export {
	formatImageFolderPath,
	getImageUrlData,
	hasValidImageExtension,
	reconstructImagesData,
};
