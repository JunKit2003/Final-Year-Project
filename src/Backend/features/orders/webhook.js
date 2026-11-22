// POST /api/stripe/webhook. Mounted with express.raw() before express.json(), because the
// signature is computed over the exact bytes Stripe sent.
import { getStripe } from "../../config/stripe.js";
import { handleStripeEvent } from "./payment.js";

export async function stripeWebhook(req, res) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return res.status(503).json({ message: "Webhook not configured." });
  let event;
  try {
    event = getStripe().webhooks.constructEvent(req.body, req.get("stripe-signature"), secret);
  } catch (error) {
    return res.status(400).json({ message: `Webhook signature check failed: ${error.message}` });
  }
  try {
    await handleStripeEvent(event);
    return res.json({ received: true });
  } catch (error) {
    // 500 makes Stripe retry later.
    console.error(`Stripe event ${event.id} (${event.type}) failed:`, error);
    return res.status(500).json({ message: "Could not process event." });
  }
}
