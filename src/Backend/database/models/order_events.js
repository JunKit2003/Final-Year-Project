// Order timeline: status changes, refunds, emails and staff-only notes.
export default (sequelize, DataTypes) =>
  sequelize.define(
    "OrderEvent",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      orderId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "orders", key: "id" }, onDelete: "CASCADE" },
      type: { type: DataTypes.ENUM("status", "note", "refund", "email"), allowNull: false },
      fromStatus: { type: DataTypes.STRING(20), allowNull: true },
      toStatus: { type: DataTypes.STRING(20), allowNull: true },
      note: { type: DataTypes.STRING(1000), allowNull: true },
      ok: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      actorId: { type: DataTypes.INTEGER, allowNull: true },
      actorName: { type: DataTypes.STRING, allowNull: true },
    },
    { tableName: "order_events", timestamps: true, updatedAt: false, indexes: [{ fields: ["orderId", "createdAt"] }] }
  );
