// Stripe webhook events already handled (Stripe can deliver the same event more than once).
export default (sequelize, DataTypes) =>
  sequelize.define(
    "StripeEvent",
    {
      eventId: { type: DataTypes.STRING, primaryKey: true },
      type: { type: DataTypes.STRING(80), allowNull: false },
    },
    { tableName: "stripe_events", timestamps: true, updatedAt: false }
  );
