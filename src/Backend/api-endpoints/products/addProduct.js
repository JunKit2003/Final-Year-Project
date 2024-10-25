import {
	pingDatabase,
	DatabaseConnectionError,
	InputValidationError,
	ProductExistsError,
	addProductToDB,
	addVariationsToDB,
  } from "../../database/utils.js";
  
  import { reconstructImagesData } from "../../file-uploads/utils.js";
  import uploadProductImages from "../../file-uploads/uploadProductImages.js";
  
  export default async function addProduct(req, res) {
	try {
	  const productDetails = req.body;
  
	  await pingDatabase();
  
	  let image_folder_path = "N/A";
  
	  // Extract and parse variations from productDetails
	  let variations = productDetails.variations;
  
	  if (typeof variations === "string") {
		try {
		  variations = JSON.parse(variations);
		} catch (error) {
		  console.error("Invalid JSON format for variations:", error);
		  return res.status(400).json({ message: "Invalid variations format." });
		}
	  }
  
	  if (!Array.isArray(variations)) {
		return res.status(400).json({ message: "Variations must be an array." });
	  }
  
	  // Remove variations from productDetails to avoid confusion
	  delete productDetails.variations;
  
	  console.log("Product details being sent to the database:", productDetails);
  
	  // Add the product to the database
	  const newProduct = await addProductToDB(productDetails);
  
	  // After the product is added, get its ID
	  const productId = newProduct.id;
  
	  // If there are image changes, process the uploaded images
	  if (productDetails.hasImageChanges === "true") {
		const files = req.files;
  
		const names = Array.isArray(req.body.names) ? req.body.names : [req.body.names];
		const keys = Array.isArray(req.body.keys) ? req.body.keys : [req.body.keys];
  
		const imagesData = reconstructImagesData(files, names, keys);
  
		// Save images using productId
		image_folder_path = await uploadProductImages(productId, imagesData);
  
		// Update productDetails with the image folder path
		productDetails.image_folder_path = image_folder_path;
	  }
  
	  // Prepare variations data by adding productId to each variation
	  if (variations.length > 0) {
		console.log("Type of variations:", typeof variations);
		console.log("Variations data:", variations);
  
		variations.forEach((variation) => {
		  variation.productId = productId;
		  // Each variation can reference its images via the image_folder_path
		  variation.image_folder_path = image_folder_path;
		});
  
		// Add variations to the database
		await addVariationsToDB(variations);
	  }
  
	  res
		.status(201)
		.send({ message: "Product and variations added successfully!" });
	} catch (error) {
	  if (error instanceof InputValidationError || error instanceof SyntaxError) {
		return res.status(400).json({ message: error.message });
	  } else if (error instanceof ProductExistsError) {
		return res.status(409).json({ message: error.message });
	  } else if (error instanceof DatabaseConnectionError) {
		return res
		  .status(500)
		  .json({ message: "Unable to connect to the database!" });
	  } else {
		console.error("Error adding product: ", error);
		res.status(500).send({ message: "Internal server error", error });
	  }
	}
  }
  