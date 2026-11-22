// Every change to a variation's stock, with why. Written in the same transaction as the change.
export const STOCK_REASONS = ["checkout_hold", "hold_released", "cancel_restock", "received", "damaged", "count_correction", "import", "initial"];

export default (sequelize, DataTypes) => {
  const StockMovement = sequelize.define(
    "StockMovement",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      variationId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "variations", key: "id" }, onDelete: "SET NULL" },
      sku: { type: DataTypes.STRING, allowNull: true },
      delta: { type: DataTypes.INTEGER, allowNull: false },
      stockAfter: { type: DataTypes.INTEGER, allowNull: false },
      reason: { type: DataTypes.ENUM(...STOCK_REASONS), allowNull: false },
      orderId: { type: DataTypes.INTEGER, allowNull: true },
      // One hold, one release and one restock per order line, enforced by the unique index.
      orderItemId: { type: DataTypes.INTEGER, allowNull: true },
      note: { type: DataTypes.STRING(300), allowNull: true },
      actorId: { type: DataTypes.INTEGER, allowNull: true },
      actorName: { type: DataTypes.STRING, allowNull: true },
    },
    {
      tableName: "stock_movements",
      timestamps: true,
      updatedAt: false,
      indexes: [
        { unique: true, fields: ["orderItemId", "reason"], name: "stock_movements_line_reason" },
        { fields: ["variationId", "createdAt"] },
        { fields: ["createdAt"] },
      ],
    }
  );
  StockMovement.associate = (models) => {
    StockMovement.belongsTo(models.Variations, { foreignKey: "variationId", as: "variation" });
  };
  return StockMovement;
};
