// History starts from today's counts: one "initial" movement per variation that has none.
export async function up({ sequelize }) {
  await sequelize.query(
    `INSERT INTO stock_movements (variationId, sku, delta, stockAfter, reason, note, createdAt)
     SELECT v.id, v.sku, v.stock, v.stock, 'initial', 'Stock when history began', NOW()
       FROM variations v
      WHERE NOT EXISTS (SELECT 1 FROM stock_movements m WHERE m.variationId = v.id)`
  );
}
