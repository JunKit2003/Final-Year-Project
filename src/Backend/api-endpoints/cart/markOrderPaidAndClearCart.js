import { PaymentsNotConfiguredError } from "../../config/stripe.js";
import { markPaid } from "../../features/orders/payment.js";
import { HttpError } from "../../features/http.js";

// PATCH /api/cart/markOrderPaidAndClearCart, called by the success page. The webhook does the
// same thing; whichever arrives first records the payment.
export default async function markOrderPaidAndClearCart(req, res) {
  const { session_id, user_id } = req.body || {};
  if (!session_id) return res.status(400).json({ message: "Missing 'session_id' in the request body!" });
  if (!user_id) return res.status(400).json({ message: "Missing 'user_id' in the request body!" });
  try {
    const { changed } = await markPaid(session_id, { source: "redirect", userId: user_id });
    return res.status(200).json({ message: changed ? "Order marked as Paid and cart items cleared." : "Order already confirmed." });
  } catch (error) {
    if (error instanceof PaymentsNotConfiguredError) return res.status(503).json({ message: error.message });
    if (error instanceof HttpError) return res.status(error.status).json({ message: error.message });
    console.error("Error confirming payment:", error);
    return res.status(500).json({ message: "Something went wrong. Please try again." });
  }
}
