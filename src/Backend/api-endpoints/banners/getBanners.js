// getBanner.js

import {
    DatabaseConnectionError,
    BannerNotFoundError,
    getBannersFromDB,
  } from "../../database/utils.js";
  
  import {
    formatImageFolderPath,
    getImageUrlDataForBanner,
  } from "../../file-uploads/utils.js";
  
  // Retrieve all banner images
  export default async function getBanners(req, res) {
    try {
      // Step 1: Retrieve banner images from the database
      const banners = await getBannersFromDB();
  
      // Step 2: Format and append additional image data
      const bannersWithImages = await Promise.all(
        banners.map(async (banner) => {
          const formattedBannerPath = formatImageFolderPath(banner.directory);
  
          // Ensure colors is an array; if not, use a default value
          const colors = Array.isArray(banner.colors) ? banner.colors : []; // Default to an empty array
  
          // Fetch additional image URL data
          const imageUrlData = await getImageUrlDataForBanner(
            formattedBannerPath,
            colors
          );
  
          // Construct the full URL for the image
          const imageUrl = `/images/banner_images/${banner.directory}`; // Adjust this path as necessary
  
          return {
            ...banner,
            imageUrl, // Use the constructed image URL
            imageUrlData, // Include additional image data if needed
          };
        })
      );
  
      // Step 3: Send response with banner images
      res.status(200).send({
        message: "Banners retrieved successfully!",
        banners: bannersWithImages,
      });
    } catch (error) {
      // Error handling for database connection issues or internal server errors
      if (error instanceof DatabaseConnectionError) {
        return res
          .status(500)
          .json({ message: "Unable to connect to the database!" });
      } else if (error instanceof BannerNotFoundError) {
        res.status(404).send({ message: error.message });
      } else {
        console.error("Error retrieving banners: ", error);
        res.status(500).send({ message: "Internal server error:", error });
      }
    }
  }
  