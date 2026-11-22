// Order payment columns. order_refunds, order_events and stripe_events are new tables
// (created by sequelize.sync).
import { DataTypes } from "sequelize";
import { addMissingColumns } from "../migrate.js";

export async function up({ qi, sequelize }) {
  await addMissingColumns(qi, "orders", {
    stripeSessionId: { type: DataTypes.STRING, allowNull: true },
    stripePaymentIntentId: { type: DataTypes.STRING, allowNull: true },
    paidAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    refundedAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    paidAt: { type: DataTypes.DATE, allowNull: true },
    courier: { type: DataTypes.STRING(60), allowNull: true },
    trackingNumber: { type: DataTypes.STRING(80), allowNull: true },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  });
  // Orders paid before payments were recorded: assume the total was charged.
  await sequelize.query("UPDATE orders SET paidAmount = totalAmount, paidAt = updatedAt WHERE status IN ('Paid','Shipped','Completed') AND paidAmount = 0");
}
