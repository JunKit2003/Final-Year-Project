import {
  pingDatabase,
  DatabaseConnectionError,
  InputValidationError,
  DatabaseError,
  setOrderStatusInDB,
} from "../../database/utils.js";

/**
* fulfillOrder
* For the route: PATCH /api/order/fulfill/:orderId
* 
* Allows only Admin users to mark an order as "Completed".
*/
export default async function fulfillOrder(req, res) {
  try {
      // 1) Authenticate User - Ensure only Admins can access this route
      if (!req.session || !req.session.user) {
          return res.status(401).json({ message: "Unauthorized: Please log in" });
      }

      if (req.session.user.category !== "Admin") {
          return res.status(403).json({ message: "Forbidden: Admin access required" });
      }

      //console.log(`Admin ${req.session.user.username} is fulfilling order ${req.params.orderId}`);

      // 2) Ping the database
      await pingDatabase();

      // 3) Validate input
      const { orderId } = req.params;
      if (!orderId) {
          throw new InputValidationError("Missing parameter: orderId.");
      }

      // 4) Update the order to "Completed"
      await setOrderStatusInDB(orderId, "Completed");

      // 5) Respond with success
      return res.status(200).json({ message: "Order marked as Completed!" });

  } catch (error) {
      if (error instanceof InputValidationError) {
          return res.status(400).json({ message: error.message });
      } else if (error instanceof DatabaseConnectionError) {
          return res.status(500).json({ message: "Unable to connect to the database!" });
      } else if (error instanceof DatabaseError) {
          return res.status(500).json({ message: error.message });
      } else {
          console.error("Error fulfilling order: ", error);
          return res.status(500).json({ message: "Internal server error", error });
      }
  }
}
