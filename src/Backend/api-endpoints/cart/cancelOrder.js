// controllers/cart/cancelOrder.js
import Stripe from "stripe";
import {
  pingDatabase,
  DatabaseConnectionError,
  InputValidationError,
  DatabaseError,
} from "../../database/utils.js";
import { db } from "../../database/index.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function cancelOrder(req, res) {
    //console.log(">>>> Inside cancelOrder controller, request body:", req.body);
  const transaction = await db.sequelize.transaction();

  try {
    // 1) Ping DB
    await pingDatabase();

    // 2) Extract from req.body
    const { session_id, user_id } = req.body;
    if (!session_id) {
      throw new InputValidationError("Missing 'session_id' in the request body!");
    }
    if (!user_id) {
      throw new InputValidationError("Missing 'user_id' in the request body!");
    }

    // 3) Retrieve the Stripe session
    const session = await stripe.checkout.sessions.retrieve(session_id);

    // Optional: check payment_status if you want to ensure it's *not* paid
    // If it's already paid, you might refuse to delete the order row:
    if (session.payment_status === "paid") {
      throw new InputValidationError(
        "This order has already been paid, cannot delete!"
      );
    }

    // 4) Get the orderId from session metadata
    const orderId = session.metadata?.orderId;
    if (!orderId) {
      throw new InputValidationError("Order ID missing in Stripe session metadata!");
    }

    // 5) Find the order with 'Pending' status
    const order = await db.Order.findOne({
      where: {
        id: orderId,
        userId: user_id,
        status: "Pending",
      },
      transaction,
    });

    if (!order) {
      throw new InputValidationError(
        `No 'Pending' order found for user ${user_id} with orderId ${orderId}.`
      );
    }

    // 6) Delete the order
    await order.destroy({ transaction });

    // 7) Commit the transaction
    await transaction.commit();

    // 8) Send success
    return res.status(200).json({
      message: "Order canceled/deleted successfully.",
    });
  } catch (error) {
    // Rollback on error
    await transaction.rollback();

    if (error instanceof InputValidationError) {
      return res.status(400).json({ message: error.message });
    } else if (error instanceof DatabaseConnectionError) {
      return res.status(500).json({ message: "Unable to connect to the database!" });
    } else if (error instanceof DatabaseError) {
      return res.status(500).json({ message: error.message });
    } else {
      console.error("Error canceling order:", error);
      return res.status(500).json({ message: "Internal server error", error });
    }
  }
}
