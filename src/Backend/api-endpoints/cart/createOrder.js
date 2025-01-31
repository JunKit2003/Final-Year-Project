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
  const transaction = await db.sequelize.transaction();

  try {
    // 1) Ping DB
    await pingDatabase();

    // 2) Extract data including recipient_name (if you made it required)
    const {
      user_id,
      items,
      shipping_address,
      total_amount,
      recipient_name, // NEW
    } = req.body;

    // 3) Validate input
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
    if (!recipient_name) {
      // or if you want to allow optional, remove this check
      throw new InputValidationError("Missing 'recipient_name' in the request body!");
    }

    // 4) Create the Order row
    const newOrder = await db.Order.create(
      {
        userId: user_id,
        shippingAddress: shipping_address,
        totalAmount: total_amount,
        recipientName: recipient_name, // NEW
        status: "Pending",
      },
      { transaction }
    );

    // 5) Build Stripe line items & create OrderItems
    const lineItems = [];

    for (const item of items) {
      if (!item.variation_id || !item.quantity) {
        throw new InputValidationError("Each item requires 'variation_id' and 'quantity'!");
      }

      const variation = await db.Variations.findByPk(item.variation_id, {
        transaction,
      });
      if (!variation) {
        throw new InputValidationError(`Variation with id ${item.variation_id} not found.`);
      }

      const price = parseFloat(variation.price);
      await db.OrderItem.create(
        {
          orderId: newOrder.id,
          variationId: item.variation_id,
          quantity: item.quantity,
          price,
        },
        { transaction }
      );

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


    const FRONTEND_URL = `${process.env.HOST}:${process.env.PORT_FRONTEND}`;

    // 6) Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${FRONTEND_URL}/paymentSuccess?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/paymentFailed?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        orderId: newOrder.id,
        userId: user_id,
      },
    });

    // Commit
    await transaction.commit();

    // 7) Return sessionId
    return res.status(200).json({ sessionId: session.id });
  } catch (error) {
    await transaction.rollback();

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
