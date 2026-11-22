// Templated emails. Wording comes from the "emails" site settings; never throws.
import { transporter, mailFrom } from "../../config/nodemailer.js";
import { renderTemplate } from "../../../shared/site-schema.js";
import { getSite } from "../settings/service.js";

export const EMAIL_LABELS = { passwordReset: "Password reset", orderShipped: "Order shipped", orderCancelled: "Order cancelled", orderRefunded: "Order refunded" };

/** Send emails[templateKey] to `to`. Returns { ok, error? }. */
export async function sendTemplated(templateKey, to, vars = {}) {
  try {
    if (!to) return { ok: false, error: "No email address" };
    if (!process.env.EMAIL_HOST && process.env.NODE_ENV !== "test") return { ok: false, error: "Email isn't set up" };
    const site = await getSite();
    const t = site.emails[templateKey];
    const all = { shopName: site.shop.name, ...vars };
    await transporter.sendMail({ from: mailFrom(), to, subject: renderTemplate(t.subject, all), text: renderTemplate(t.body, all) });
    return { ok: true };
  } catch (error) {
    console.error(`Email ${templateKey} to ${to} failed:`, error?.message || error);
    return { ok: false, error: error?.message || "Send failed" };
  }
}
