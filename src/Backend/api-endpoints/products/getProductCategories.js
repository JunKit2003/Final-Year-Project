import {
	DatabaseConnectionError,
	getProductsCategoryFromDB,
  } from "../../database/utils.js";
  
  // Retrieve unique product categories
  export default async function getProductsCategories(req, res) {
	try {
	  // Get unique categories from the database
	  const categories = await getProductsCategoryFromDB();
  
	  // Check if any categories were retrieved
	  if (!categories || categories.length === 0) {
		return res.status(404).send({ message: "No categories found." });
	  }
  
	  // Send response with the unique categories
	  res.status(200).send({
		message: "Product categories retrieved successfully!",
		categories: categories, // Include the unique categories
	  });
	} catch (error) {
	  if (error instanceof DatabaseConnectionError) {
		res.status(500).send({ message: "Unable to connect to the database!" });
	  } else {
		console.error("Error retrieving categories: ", error);
		res.status(500).send({ message: "Internal server error", error });
	  }
	}
  }
  