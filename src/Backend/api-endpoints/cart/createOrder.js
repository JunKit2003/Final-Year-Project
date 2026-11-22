import { PaymentsNotConfiguredError } from "../../config/stripe.js";
import { startCheckout } from "../../features/orders/payment.js";
import { HttpError } from "../../features/http.js";

// POST /api/cart/createOrder. The total is worked out from current prices on the server;
// a total sent by the browser is ignored.
export default async function createOrder(req, res) {
  const { user_id, items, shipping_address, recipient_name, phoneNumber } = req.body || {};
  if (!user_id) return res.status(400).json({ message: "Missing 'user_id' in the request body!" });
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: "Missing or invalid 'items' in the request body!" });
  if (!shipping_address) return res.status(400).json({ message: "Missing 'shipping_address' in the request body!" });
  if (!recipient_name) return res.status(400).json({ message: "Missing 'recipient_name' in the request body!" });
  if (!phoneNumber) return res.status(400).json({ message: "Missing 'phoneNumber' in the request body!" });

  const publicUrl = process.env.PUBLIC_URL || `${process.env.HOST}:${process.env.PORT_FRONTEND}`;
  try {
    const { session } = await startCheckout({ userId: user_id, items, shippingAddress: shipping_address, recipientName: recipient_name, phoneNumber, publicUrl });
    // url: Stripe-hosted checkout page; the frontend redirects to it.
    return res.status(200).json({ sessionId: session.id, url: session.url });
  } catch (error) {
    if (error instanceof PaymentsNotConfiguredError) return res.status(503).json({ message: error.message });
    if (error instanceof HttpError) return res.status(error.status).json({ message: error.message, ...error.extra });
    console.error("Error creating order:", error);
    return res.status(500).json({ message: "Something went wrong. Please try again." });
  }
}
