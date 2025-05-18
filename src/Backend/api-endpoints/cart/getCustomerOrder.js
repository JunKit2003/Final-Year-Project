// controllers/getCustomerOrder.js
import {
    pingDatabase,
    DatabaseConnectionError,
    InputValidationError,
    DatabaseError,
  } from "../../database/utils.js";
  import { db } from "../../database/index.js";
  
  /**
   * getCustomerOrder
   * For the route: POST /api/order/getCustomerOrder
   *
   * Fetches a single order for a specific user/customer.
   * 
   * You can adapt this to use route params, e.g. /getCustomerOrder/:orderId,
   * or keep it as POST with { orderId, userId } in req.body.
   */
  export default async function getCustomerOrder(req, res) {
    try {
      // 1) Ping the database to ensure connectivity
      await pingDatabase();
  
      // 2) Extract input from req.body (or req.params, if using route params)
      const { orderId, userId } = req.body; 
      // If using route params: const { orderId } = req.params;
      // and you might get userId from req.user, depending on your auth.
  
      // Validate input
      if (!orderId) {
        throw new InputValidationError("Missing 'orderId' in the request body!");
      }
      if (!userId) {
        throw new InputValidationError("Missing 'userId' in the request body!");
      }
  
      // 3) Find the order in the database
      const order = await db.Order.findOne({
        where: { id: orderId, userId: userId }, // Ensures it belongs to this user
        include: [
          {
            model: db.OrderItem,
            as: "items",
            // If you want product/variation details, nest includes here:
            // include: [{ model: db.Variations, as: "variation" }]
          },
        ],
      });
  
      // If order not found or doesn't belong to this user, return error
      if (!order) {
        return res.status(404).json({
          message: "Order not found or you do not have permission to view it.",
        });
      }
  
      // 4) Convert to plain JS object if desired
      const plainOrder = order.get({ plain: true });
  
      // 5) Return the single order
      return res.status(200).json({ order: plainOrder });
    } catch (error) {
      // Handle known errors
      if (error instanceof InputValidationError) {
        return res.status(400).json({ message: error.message });
      } else if (error instanceof DatabaseConnectionError) {
        return res.status(500).json({ message: "Unable to connect to the database!" });
      } else if (error instanceof DatabaseError) {
        return res.status(500).json({ message: error.message });
      } else {
        console.error("Error fetching single order: ", error);
        return res.status(500).json({ message: "Internal server error", error });
      }
    }
  }
  