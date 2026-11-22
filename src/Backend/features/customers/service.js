import { Op, literal } from "sequelize";
import { db } from "../../database/index.js";
import { logActivity } from "../activity/service.js";
import { ForbiddenError, NotFoundError, ValidationError } from "../http.js";
import { paymentState } from "../orders/service.js";

const n = (v) => Math.round(Number(v || 0) * 100) / 100;
const SPENT = literal("(SELECT COALESCE(SUM(o.paidAmount - o.refundedAmount), 0) FROM orders o WHERE o.userId = `Account`.`id`)");
const ORDERS = literal("(SELECT COUNT(*) FROM orders o WHERE o.userId = `Account`.`id` AND o.status <> 'Pending')");

const toJSON = (a) => ({
  id: a.id,
  name: `${a.first_name} ${a.last_name}`.trim(),
  username: a.username,
  email: a.email,
  phone: a.phone_number,
  category: a.category,
  isActive: a.isActive,
  createdAt: a.createdAt,
  orderCount: Number(a.get("orderCount") ?? 0),
  spent: n(a.get("spent")),
});

export async function listCustomers({ q, role, active, limit, offset }) {
  const where = {};
  if (role === "Admin" || role === "Customer") where.category = role;
  if (active === "true" || active === "false") where.isActive = active === "true";
  const needle = String(q || "").trim();
  if (needle) {
    const like = { [Op.like]: `%${needle}%` };
    where[Op.or] = [{ first_name: like }, { last_name: like }, { username: like }, { email: like }, { phone_number: like }];
  }
  const { rows, count } = await db.Account.findAndCountAll({
    where,
    attributes: { exclude: ["password", "password_reset_token", "password_reset_token_expiration"], include: [[ORDERS, "orderCount"], [SPENT, "spent"]] },
    order: [["createdAt", "DESC"], ["id", "DESC"]],
    limit,
    offset,
  });
  return { items: rows.map(toJSON), total: count };
}

export async function getCustomer(id) {
  const a = await db.Account.findByPk(id, { attributes: { exclude: ["password", "password_reset_token", "password_reset_token_expiration"], include: [[ORDERS, "orderCount"], [SPENT, "spent"]] } });
  if (!a) throw new NotFoundError("Customer not found.");
  const orders = await db.Order.findAll({ where: { userId: id }, order: [["createdAt", "DESC"]], limit: 100 });
  return {
    customer: toJSON(a),
    orders: orders.map((o) => ({ id: o.id, createdAt: o.createdAt, status: o.status, totalAmount: n(o.totalAmount), paymentState: paymentState(o) })),
  };
}

export async function updateCustomer(id, body, actor) {
  const a = await db.Account.findByPk(id);
  if (!a) throw new NotFoundError("Customer not found.");
  const patch = {};
  if (body.category !== undefined) {
    if (!["Admin", "Customer"].includes(body.category)) throw new ValidationError({ category: "Pick Admin or Customer" });
    patch.category = body.category;
  }
  if (body.isActive !== undefined) patch.isActive = body.isActive === true;
  const self = String(actor?.id) === String(id);
  if (self && patch.category === "Customer") throw new ForbiddenError("You can't remove your own admin access");
  if (self && patch.isActive === false) throw new ForbiddenError("You can't deactivate your own account");
  const losingAdmin = a.category === "Admin" && a.isActive && (patch.category === "Customer" || patch.isActive === false);
  if (losingAdmin) {
    const others = await db.Account.count({ where: { category: "Admin", isActive: true, id: { [Op.ne]: id } } });
    if (!others) throw new ForbiddenError("There must be at least one active admin");
  }
  await a.update(patch, { hooks: false });
  // Signed-in sessions of a deactivated account end now.
  if (patch.isActive === false) {
    await db.sequelize.query("DELETE FROM Sessions WHERE data LIKE :pat", { replacements: { pat: `%"user":{"id":${Number(id)},%` } }).catch(() => {});
  }
  const what = [patch.category && `role ${patch.category}`, patch.isActive !== undefined && (patch.isActive ? "reactivated" : "deactivated")].filter(Boolean).join(", ");
  await logActivity({ actor, action: "customer.update", entity: "account", entityId: id, summary: `Changed ${a.username}: ${what}` });
  return (await getCustomer(id)).customer;
}

