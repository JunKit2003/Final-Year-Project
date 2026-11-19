import Stripe from "stripe";

// Pinned to the API version of the installed stripe SDK (23.x) so an SDK bump
// can't silently change payment behaviour.
export const STRIPE_API_VERSION = "2026-11-18.endive";

export class PaymentsNotConfiguredError extends Error {}

let client = null;

// Created on first use, not at import: stripe >= 18 throws without a key, which would
// stop the whole API from booting when payments aren't configured (e.g. local dev).
export function getStripe() {
  if (!client) {
    if (!process.env.STRIPE_SECRET_KEY) {
      // Detail for operators in the log; shoppers get a friendly message.
      console.error("Stripe: STRIPE_SECRET_KEY is not set, online payments are disabled.");
      throw new PaymentsNotConfiguredError("Online payments are unavailable right now. Please WhatsApp us to complete your order.");
    }
    client = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: STRIPE_API_VERSION });
  }
  return client;
}
