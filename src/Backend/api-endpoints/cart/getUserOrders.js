// controllers/getUserOrders.js
import {
    pingDatabase,
    DatabaseConnectionError,
    InputValidationError,
    DatabaseError,
    // You’ll define this function in your database utils to query by userId
    getUserOrdersFromDB,
  } from "../../database/utils.js";
  
  /**
   * getUserOrders
   * For the route: GET /api/order/getUserOrders/:userId
   * 
   * Fetches all orders for a specific user (by userId).
   */
  export default async function getUserOrders(req, res) {
    try {
      // 1) Ping the database to ensure connectivity
      await pingDatabase();
  
      // 2) Extract userId from route params (or req.body if POST)
      const { userId } = req.params; 
      if (!userId) {
        throw new InputValidationError("Missing userId in route parameters!");
      }
  
      // 3) Fetch user’s orders from the database
      const orders = await getUserOrdersFromDB(userId);
  
      // 4) Return the orders in the response
      return res.status(200).json({ orders });
    } catch (error) {
      // Handle known errors
      if (error instanceof InputValidationError) {
        return res.status(400).json({ message: error.message });
      } else if (error instanceof DatabaseConnectionError) {
        return res.status(500).json({ message: "Unable to connect to the database!" });
      } else if (error instanceof DatabaseError) {
        return res.status(500).json({ message: error.message });
      } else {
        console.error("Error fetching user orders: ", error);
        return res.status(500).json({ message: "Internal server error", error });
      }
    }
  }
  