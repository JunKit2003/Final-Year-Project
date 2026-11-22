// Refunds made from the admin. Created as "pending" before Stripe is called; the row id is
// the Stripe idempotency key, so a retry can never refund twice.
export default (sequelize, DataTypes) =>
  sequelize.define(
    "OrderRefund",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      orderId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "orders", key: "id" }, onDelete: "CASCADE" },
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      reason: { type: DataTypes.STRING(300), allowNull: false },
      status: { type: DataTypes.ENUM("pending", "succeeded", "failed"), allowNull: false, defaultValue: "pending" },
      stripeRefundId: { type: DataTypes.STRING, allowNull: true },
      error: { type: DataTypes.STRING(300), allowNull: true },
      actorId: { type: DataTypes.INTEGER, allowNull: true },
      actorName: { type: DataTypes.STRING, allowNull: true },
    },
    { tableName: "order_refunds", timestamps: true }
  );
