import { rm } from "../../lib/format";

export const STATUSES = ["Pending", "Paid", "Shipped", "Completed", "Cancelled"];
export const STATUS_TONE = { Pending: "pending", Paid: "paid", Shipped: "shipped", Completed: "completed", Cancelled: "cancelled" };
export const PAYMENT_LABEL = { unpaid: "Unpaid", paid: "Paid", partly_refunded: "Partly refunded", refunded: "Refunded" };
export const paymentLabel = (s) => PAYMENT_LABEL[s] || s;

/** Client-side check matching the server's refund rules. */
export function refundError(amount, max) {
  const a = Number(amount);
  if (amount === "" || !Number.isFinite(a) || a <= 0) return "Enter an amount above RM 0.00";
  if (a > max + 1e-9) return `Can't refund more than ${rm(max)}`;
  return null;
}
