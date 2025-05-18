import {
  pingDatabase,
  DatabaseConnectionError,
  InputValidationError,
  updateBrandImageInDB,
} from "../../database/utils.js";

import uploadBrandImage from "../../file-uploads/uploadBrandImage.js";
import { unlink } from "fs/promises"; // For file deletion
import { join } from "path";

export default async function updateBrandImage(req, res) {
  try {
    // Ensure DB connectivity
    await pingDatabase();

    // Extract the brand ID from params
    const { id } = req.params;

    // Fetch the current brand details from the database
    const currentBrand = await updateBrandImageInDB(id);

    if (!currentBrand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    // If your form-data includes other text fields, they land in req.body
    const brandDetails = req.body;
    console.log("Received brand details:", brandDetails);

    // Grab the files array from req.files
    const { files } = req;

    // If there is an uploaded file, handle the file update
    if (files && files.length > 0) {
      // We only take the first file in this example
      const file = files[0];

      // Remove the previous image file if it exists
      if (currentBrand.imagePath) {
        const oldImagePath = join("images", "brand_images", currentBrand.imagePath);
        try {
          await unlink(oldImagePath);
          console.log(`Deleted old image: ${oldImagePath}`);
        } catch (error) {
          console.warn(`Could not delete old image: ${oldImagePath}`, error);
        }
      }

      // Upload the new image
      const newImagePath = await uploadBrandImage(id, file, "images/brand_images");

      // Store the new filename in brandDetails.imagePath
      brandDetails.imagePath = newImagePath;
    }

    // Update the brand image path in the database
    const updatedBrand = await updateBrandImageInDB(id, brandDetails);

    if (!updatedBrand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    return res.status(200).json({
      message: "Brand updated successfully",
      updatedBrand,
    });
  } catch (error) {
    console.error("Error updating brand:", error);

    if (error instanceof DatabaseConnectionError) {
      return res.status(500).json({
        message: "Database connection error",
        error,
      });
    } else if (error instanceof InputValidationError) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Internal server error", error });
  }
}
