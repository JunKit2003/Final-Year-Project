import Stripe from "stripe";
import {
  pingDatabase,
  DatabaseConnectionError,
  InputValidationError,
  DatabaseError,
} from "../../database/utils.js";
import { db } from "../../database/index.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function createOrder(req, res) {
  const transaction = await db.sequelize.transaction(); // Start a transaction

  try {
    // 1) Ping the database to ensure connectivity
    await pingDatabase();

    // 2) Extract necessary data from req.body
    const { user_id, items, shipping_address, total_amount } = req.body;

    // 3) Validate the input
    if (!user_id) {
      throw new InputValidationError("Missing 'user_id' in the request body!");
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new InputValidationError("Missing or invalid 'items' in the request body!");
    }
    if (!shipping_address) {
      throw new InputValidationError("Missing 'shipping_address' in the request body!");
    }
    if (typeof total_amount === "undefined") {
      throw new InputValidationError("Missing 'total_amount' in the request body!");
    }

    // 4) Create a new Order in the database within the transaction
    const newOrder = await db.Order.create(
      {
        userId: user_id,
        shippingAddress: shipping_address,
        totalAmount: total_amount,
        status: "Pending",
      },
      { transaction }
    );

    // 5) Process OrderItems and build Stripe line items
    const lineItems = [];

    for (const item of items) {
      if (!item.variation_id || !item.quantity) {
        throw new InputValidationError("Each item requires 'variation_id' and 'quantity'!");
      }

      // Fetch the variation to validate its existence and get the price
      const variation = await db.Variations.findByPk(item.variation_id, { transaction });
      if (!variation) {
        throw new InputValidationError(`Variation with id ${item.variation_id} not found.`);
      }

      // Create an OrderItem in the database
      const price = parseFloat(variation.price);
      await db.OrderItem.create(
        {
          orderId: newOrder.id,
          variationId: item.variation_id,
          quantity: item.quantity,
          price: price,
        },
        { transaction }
      );

      // Build line item for Stripe Checkout
      lineItems.push({
        price_data: {
          currency: "myr",
          product_data: {
            name: variation.name || `Variation #${variation.id}`,
          },
          unit_amount: Math.round(price * 100),
        },
        quantity: item.quantity,
      });
    }

    // 6) Create a Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.HOST}:3000/paymentSuccess?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.HOST}:3000/paymentFailed`,
      metadata: {
        orderId: newOrder.id,
        userId: user_id,
      },
    });

    // Commit the transaction if everything succeeds
    await transaction.commit();

    // 7) Return the sessionId for the frontend to redirect
    return res.status(200).json({ sessionId: session.id });
  } catch (error) {
    // Rollback the transaction to undo any changes in the database
    await transaction.rollback();

    // Handle known errors
    if (error instanceof InputValidationError) {
      return res.status(400).json({ message: error.message });
    } else if (error instanceof DatabaseConnectionError) {
      return res.status(500).json({ message: "Unable to connect to the database!" });
    } else if (error instanceof DatabaseError) {
      return res.status(500).json({ message: error.message });
    } else {
      console.error("Error creating order: ", error);
      return res.status(500).json({ message: "Internal server error", error });
    }
  }
}
