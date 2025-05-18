import {
    pingDatabase,
    DatabaseConnectionError,
    InputValidationError,
    // Utility for fetching cart items
    getCartItemsFromDB,
  } from "../../database/utils.js";
  
  export default async function getCartItems(req, res) {
    try {
      await pingDatabase();
  
      const { user_id } = req.params;
      if (!user_id) {
        throw new InputValidationError("Missing parameter: user_id.");
      }
  
      const cartItems = await getCartItemsFromDB(user_id);
  
      return res.status(200).json(cartItems);
    } catch (error) {
      if (error instanceof InputValidationError) {
        return res.status(400).json({ message: error.message });
      } else if (error instanceof DatabaseConnectionError) {
        return res
          .status(500)
          .json({ message: "Unable to connect to the database!" });
      } else {
        console.error("Error fetching cart items: ", error);
        return res.status(500).send({ message: "Internal server error", error });
      }
    }
  }
  