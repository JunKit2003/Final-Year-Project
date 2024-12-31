import {
    pingDatabase,
    DatabaseConnectionError,
    InputValidationError,
    // You'd define this utility in your database utils
    // something like "INSERT INTO cart ... ON DUPLICATE KEY UPDATE quantity"
    addCartItemToDB,
  } from "../../database/utils.js";
  
  export default async function addToCart(req, res) {
    try {
      await pingDatabase();
  
      console.log("Request Body:", req.body);
  
      // Destructure with the correct variable names
      const { user_id, variation_id, quantity } = req.body;
  
      if (!user_id || !variation_id || !quantity) {
        throw new InputValidationError("Missing required fields: user_id, variation_id, or quantity.");
      }
  
      // Pass the correct variables to the utility function
      await addCartItemToDB(user_id, variation_id, quantity);
  
      return res.status(201).json({ message: "Item added to cart successfully!" });
    } catch (error) {
      if (error instanceof InputValidationError) {
        return res.status(400).json({ message: error.message });
      } else {
        console.error("Error adding item to cart:", error);
        return res.status(500).json({ message: "Internal server error", error });
      }
    }
  }