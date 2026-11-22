import { getStripe, PaymentsNotConfiguredError } from "../../config/stripe.js";
import { cancelPending } from "../../features/orders/payment.js";

// DELETE /api/cart/cancelOrder, called when the shopper backs out of Stripe Checkout.
// The order is kept (as Cancelled) and its held stock goes back on the shelf.
export default async function cancelOrder(req, res) {
  const { session_id, user_id } = req.body || {};
  if (!session_id) return res.status(400).json({ message: "Missing 'session_id' in the request body!" });
  if (!user_id) return res.status(400).json({ message: "Missing 'user_id' in the request body!" });
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status === "paid") return res.status(400).json({ message: "This order has already been paid, cannot cancel!" });
    const orderId = Number(session.metadata?.orderId);
    if (!orderId) return res.status(400).json({ message: "Order ID missing in Stripe session metadata!" });
    const changed = await cancelPending(orderId, { note: "Cancelled at checkout", userId: user_id });
    if (!changed) return res.status(400).json({ message: `No 'Pending' order found for user ${user_id} with orderId ${orderId}.` });
    if (session.status === "open") await stripe.checkout.sessions.expire(session_id).catch(() => {});
    return res.status(200).json({ message: "Order cancelled." });
  } catch (error) {
    if (error instanceof PaymentsNotConfiguredError) return res.status(503).json({ message: error.message });
    console.error("Error cancelling order:", error);
    return res.status(500).json({ message: "Something went wrong. Please try again." });
  }
}
