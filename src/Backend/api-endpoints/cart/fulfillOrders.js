// controllers/fulfillOrder.js
import {
    pingDatabase,
    DatabaseConnectionError,
    InputValidationError,
    DatabaseError,
    // Utility function for setting order to "Fulfilled"
    setOrderStatusInDB,
  } from "../../database/utils.js";
  
  /**
   * fulfillOrder
   * For the route: PATCH /api/order/fulfill/:orderId
   * 
   * Marks a specific order as "Fulfilled" in the database.
   */
  export default async function fulfillOrder(req, res) {
    try {
      // 1) Ping the database
      await pingDatabase();
  
      // 2) Validate input
      const { orderId } = req.params;
      if (!orderId) {
        throw new InputValidationError("Missing parameter: orderId.");
      }
  
      // 3) Update the order to "Fulfilled"
      // You might also check if the order is currently "Paid" or if user is authorized, etc.
      await setOrderStatusInDB(orderId, "Completed");
  
      // 4) Respond with success
      return res.status(200).json({ message: "Order marked as Completed!" });
    } catch (error) {
      if (error instanceof InputValidationError) {
        return res.status(400).json({ message: error.message });
      } else if (error instanceof DatabaseConnectionError) {
        return res
          .status(500)
          .json({ message: "Unable to connect to the database!" });
      } else if (error instanceof DatabaseError) {
        return res.status(500).json({ message: error.message });
      } else {
        console.error("Error fulfilling order: ", error);
        return res.status(500).json({ message: "Internal server error", error });
      }
    }
  }
  