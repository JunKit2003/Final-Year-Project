import {
	pingDatabase,
	DatabaseConnectionError,
	InputValidationError,
	ProductNotFoundError,
	updateProductToDB,
	updateVariationsToDB,
  } from "../../database/utils.js";
  
  import { reconstructImagesData } from "../../file-uploads/utils.js";
  import uploadProductImages from "../../file-uploads/uploadProductImages.js";
  
  // Update a product and its variations
  export default async function updateProduct(req, res) {
	try {
	  const { id } = req.params;
	  let productDetails = req.body;
  
	  //console.log("Received product details:", productDetails);
  
	  // Parse variations if it's a string
	  let variations = productDetails.variations;
	  if (typeof variations === "string") {
		try {
		  variations = JSON.parse(variations);
		} catch (error) {
		  console.error("Invalid JSON for variations:", error);
		  return res.status(400).json({ message: "Invalid variations format." });
		}
	  }
  
	  if (!Array.isArray(variations)) {
		return res.status(400).json({ message: "Variations must be an array." });
	  }
  
	  // If image changes, reconstruct imagesData
	  if (productDetails.hasImageChanges === "true") {
		const files = req.files;
		
		const names = Array.isArray(req.body.names) ? req.body.names : [req.body.names];
		const keys = Array.isArray(req.body.keys) ? req.body.keys : [req.body.keys];
	  
		const imagesData = reconstructImagesData(files, names, keys);
	  
		// Ensure you have the productId available
		const productId = id; // Assuming 'id' is the productId from req.params
	  
		// Save images using productId
		const image_folder_path = await uploadProductImages(productId, imagesData);
	  
		productDetails.image_folder_path = image_folder_path;
	  }
  
	  delete productDetails.variations; // Avoid confusion
  
	  // Update product and variations in the database
	  await updateProductToDB(id, productDetails);
  
	  variations.forEach((variation) => {
		variation.productId = id;
		if (productDetails.image_folder_path) {
		  variation.image_folder_path = productDetails.image_folder_path;
		}
	  });
  
	  await updateVariationsToDB(id, variations);
  
	  res.status(200).json({ message: "Product and variations updated successfully" });
	} catch (error) {
	  console.error("Error updating product:", error);
	  res.status(500).json({ message: "Internal server error", error });
	}
  }
  