import {
    pingDatabase,
    DatabaseConnectionError,
    InputValidationError,
    // Utility for removing an item from the cart
    removeCartItemFromDB,
  } from "../../database/utils.js";
  
  export default async function removeCartItem(req, res) {
    try {
      await pingDatabase();
  
      //console.log("Request Params:", req.params); // Debugging
  
      const { cart_item_id } = req.params;
  
      if (!cart_item_id) {
        throw new InputValidationError("Missing parameter: cart_item_id.");
      }
  
      //console.log("Cart Item ID Passed to DB Function:", cart_item_id); // Add Debugging
  
      await removeCartItemFromDB(cart_item_id);
  
      return res.status(200).json({ message: "Item removed from cart successfully!" });
    } catch (error) {
      if (error instanceof InputValidationError) {
        return res.status(400).json({ message: error.message });
      } else {
        console.error("Error removing cart item:", error);
        return res.status(500).json({ message: "Internal server error", error });
      }
    }
  }