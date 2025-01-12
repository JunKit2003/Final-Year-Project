// controllers/getOrders.js
import {
    pingDatabase,
    DatabaseConnectionError,
    InputValidationError,
    DatabaseError,
    // A utility function you'd define in your database utils, e.g. getAllOrdersFromDB
    getAllOrdersFromDB,
  } from "../../database/utils.js";
  
  /**
   * getOrders
   * For the route: POST /api/order/get
   * 
   * Fetches all orders from the database. Adjust if you only want
   * orders for a specific user, or a certain status, etc.
   */
  export default async function getOrders(req, res) {
    try {
      // 1) Ping the database to ensure connectivity
      await pingDatabase();
  
      // 2) (Optional) Validate any required parameters from req.body,
      //    but if you're just fetching all orders, no input needed.
      //    e.g., if you expected { userId }, you'd do:
      // const { userId } = req.body;
      // if (!userId) throw new InputValidationError("Missing userId.");
  
      // 3) Fetch orders from the database (utility function)
      const orders = await getAllOrdersFromDB(); 
      // e.g. returns an array of orders: [{ id, userId, status, totalAmount, etc. }, ...]
  
      // 4) Return the orders in the response
      return res.status(200).json({ orders });
    } catch (error) {
      // Handle known errors
      if (error instanceof InputValidationError) {
        return res.status(400).json({ message: error.message });
      } else if (error instanceof DatabaseConnectionError) {
        return res
          .status(500)
          .json({ message: "Unable to connect to the database!" });
      } else if (error instanceof DatabaseError) {
        return res.status(500).json({ message: error.message });
      } else {
        console.error("Error fetching orders: ", error);
        return res.status(500).json({ message: "Internal server error", error });
      }
    }
  }
  