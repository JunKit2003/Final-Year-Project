import {
	DatabaseConnectionError,
	getProductBrandsFromDB,
  } from "../../database/utils.js";
  
  // Retrieve unique product brands
  export default async function getProductBrands(req, res) {
	try {
	  // Get unique brands from the database
	  const brands = await getProductBrandsFromDB();
  
	  // Check if any brands were retrieved
	  if (!brands || brands.length === 0) {
		return res.status(404).send({ message: "No brands found." });
	  }
  
	  // Send response with the unique brands
	  res.status(200).send({
		message: "Product brands retrieved successfully!",
		brands: brands.map((brand) => brand.brand), // Adjusted to match your data structure
	  });
	} catch (error) {
	  if (error instanceof DatabaseConnectionError) {
		res.status(500).send({ message: "Unable to connect to the database!" });
	  } else {
		console.error("Error retrieving brands: ", error);
		res.status(500).send({ message: "Internal server error", error });
	  }
	}
  }
  