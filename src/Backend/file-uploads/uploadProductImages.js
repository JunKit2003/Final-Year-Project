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

  if (fs.existsSync(directory)) {
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
}

export default async function uploadProductImages(productId, imagesData) {
  try {
    // Create the base directory using productId
    const baseDirectory = join(
      "images",
      "product_images",
      productId.toString()
    );

    // Ensure the base directory exists
    ensureDirectoryExists(baseDirectory);

    // Delete all existing files in the base directory
    await deleteAllFilesInDirectory(baseDirectory);

    // For each variation (SKU) in imagesData
    for (const [sku, { files, names }] of Object.entries(imagesData)) {
      if (files.length !== names.length) {
        throw new Error(
          `Mismatch between files and names for variation SKU: ${sku}`
        );
      }

      // Create a subdirectory for each variation SKU
      const variationDirectory = join(baseDirectory, sku);
      ensureDirectoryExists(variationDirectory);

      // Save each file for this variation
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let fileName = names[i];

        // Extract the original file extension
        const originalExtension = extname(file.originalname).toLowerCase();

        // Check if the original file extension is valid
        if (!hasValidImageExtension(file.originalname)) {
          console.log(
            `Skipping file: ${file.originalname}, not a valid image extension.`
          );
          continue;
        }

        // Ensure the fileName has a valid image extension
        if (!hasValidImageExtension(fileName)) {
          const extensionToUse = originalExtension || ".png";
          fileName = `${fileName}${extensionToUse}`;
        }

        // Save the image with an index-based name or keep the provided name
        const imageIndex = i + 1;
        fileName = `image_${imageIndex}${extname(fileName)}`;

        const filePath = join(variationDirectory, fileName);

        // Save the file to disk
        await writeFile(filePath, file.buffer);

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
