import Stripe from "stripe";
import {
  pingDatabase,
  DatabaseConnectionError,
  InputValidationError,
  DatabaseError,
} from "../../database/utils.js";
import { db } from "../../database/index.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function markOrderPaidAndClearCart(req, res) {
  const transaction = await db.sequelize.transaction();

  try {
    // 1) Ping the database to ensure connectivity
    await pingDatabase();

    // 2) Extract data from req.body
    const { session_id, user_id } = req.body;

    // 3) Validate the input
    if (!session_id) {
      throw new InputValidationError("Missing 'session_id' in the request body!");
    }
    if (!user_id) {
      throw new InputValidationError("Missing 'user_id' in the request body!");
    }

    // 4) Verify the session from Stripe to confirm payment
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (!session || session.payment_status !== "paid") {
      throw new InputValidationError("Session not found or payment not completed!");
    }

    // 5) Retrieve metadata from the session to find selected items
    const orderId = session.metadata?.orderId;
    if (!orderId) {
      throw new InputValidationError("Order ID missing in Stripe session metadata!");
    }

    // 6) Find the user's pending order
    const order = await db.Order.findOne({
      where: {
        id: orderId,
        userId: user_id,
        status: "Pending",
      },
      include: [{ model: db.OrderItem, as: "items" }],
      transaction,
    });

    if (!order) {
      throw new InputValidationError(
        `No pending order found for user with ID ${user_id}.`
      );
    }

    // 7) Update the order status to "Paid"
    await order.update({ status: "Paid" }, { transaction });

    // 8) Clear only the selected items from the user's cart
    const selectedVariationIds = order.items.map((item) => item.variationId);

    await db.Cart.destroy({
      where: {
        accountId: user_id,
        variationId: selectedVariationIds, // Match selected items
      },
      transaction,
    });

    // 9) Commit the transaction if everything succeeds
    await transaction.commit();

    // 10) Return success response
    return res
      .status(200)
      .json({ message: "Order marked as Paid and selected cart items cleared successfully." });
  } catch (error) {
    // Roll back any changes on error
    await transaction.rollback();

    // Handle known errors
    if (error instanceof InputValidationError) {
      return res.status(400).json({ message: error.message });
    } else if (error instanceof DatabaseConnectionError) {
      return res.status(500).json({ message: "Unable to connect to the database!" });
    } else if (error instanceof DatabaseError) {
      return res.status(500).json({ message: error.message });
    } else {
      console.error("Error marking order Paid and clearing cart:", error);
      return res.status(500).json({ message: "Internal server error", error });
    }
  }
}
