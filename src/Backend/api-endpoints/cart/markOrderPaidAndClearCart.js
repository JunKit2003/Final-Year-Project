import { getStripe } from "../../config/stripe.js";
import {
  pingDatabase,
  DatabaseConnectionError,
  InputValidationError,
  DatabaseError,
} from "../../database/utils.js";
import { db } from "../../database/index.js";
import { Op } from "sequelize"; // Import Op from Sequelize


export default async function markOrderPaidAndClearCart(req, res) {
  // Before opening a DB transaction: no Stripe key means no payments (503), not a crash.
  let stripe;
  try {
    stripe = getStripe();
  } catch (error) {
    return res.status(503).json({ message: error.message });
  }

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

    // 8) Aggregate quantity per variation (to avoid double subtraction)
    const variationQuantities = {};
    for (const item of order.items) {
      if (!variationQuantities[item.variationId]) {
        variationQuantities[item.variationId] = 0;
      }
      variationQuantities[item.variationId] += item.quantity;
    }

    // 9) Reduce stock for purchased variations
    for (const [variationId, totalQuantity] of Object.entries(variationQuantities)) {
      const variation = await db.Variations.findOne({
        where: { id: variationId },
        transaction,
        lock: transaction.LOCK.UPDATE, // Lock row to prevent race conditions
      });

      if (variation) {
        const newStock = Math.max(0, variation.stock - totalQuantity); // Prevent negative stock
        await variation.update({ stock: newStock }, { transaction });
        //console.log(`Stock updated for variation ${variationId}: New stock = ${newStock}`);
      } else {
        //console.warn(`Variation ${variationId} not found!`);
      }
    }

    // 10) Clear only the selected items from the user's cart
    const selectedVariationIds = Object.keys(variationQuantities);

    await db.Cart.destroy({
      where: {
        accountId: user_id,
        variationId: { [Op.in]: selectedVariationIds }, // Ensure deletion of only purchased items
      },
      transaction,
    });

    //console.log("Cleared cart items:", selectedVariationIds);

    // 11) Commit the transaction if everything succeeds
    await transaction.commit();

    // 12) Return success response
    return res.status(200).json({
      message: "Order marked as Paid, stock updated, and cart items cleared successfully.",
    });

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
      //console.error("Error marking order Paid and updating stock:", error);
      return res.status(500).json({ message: "Internal server error", error });
    }
  }
}
