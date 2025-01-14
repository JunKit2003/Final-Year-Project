import {
    DatabaseConnectionError,
    getBrandImagesFromDB,
  } from "../../database/utils.js";
  
  import { formatImageFolderPath } from "../../file-uploads/utils.js";
  
  // Retrieve all brand images
  export default async function getBrandImages(req, res) {
    try {
      // Step 1: Retrieve brand images from the database
      const brands = await getBrandImagesFromDB();
  
      // Step 2: Format and append additional image data
      const brandsWithImages = brands.map((brand) => {
        // Construct the full URL for the image
        const imageUrl = `/images/brand_images/${brand.imagePath}`; // Adjust this path as necessary
  
        return {
          ...brand,
          imageUrl, // Use the constructed image URL
        };
      });
  
      // Step 3: Send response with brand images
      res.status(200).send({
        message: "Brand images retrieved successfully!",
        brands: brandsWithImages,
      });
    } catch (error) {
      // Error handling for database connection issues or internal server errors
      if (error instanceof DatabaseConnectionError) {
        return res
          .status(500)
          .json({ message: "Unable to connect to the database!" });
      } else {
        console.error("Error retrieving brand images: ", error);
        res.status(500).send({ message: "Internal server error:", error });
      }
    }
  }
  