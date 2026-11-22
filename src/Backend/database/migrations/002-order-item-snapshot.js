// Order lines keep a snapshot of what was bought, and stop cascading when a
// variation is deleted (which used to erase the line from order history).
import { DataTypes } from "sequelize";
import { addMissingColumns } from "../migrate.js";

export async function up({ qi, sequelize }) {
  await addMissingColumns(qi, "order_items", {
    productName: { type: DataTypes.STRING, allowNull: true },
    variationName: { type: DataTypes.STRING, allowNull: true },
    sku: { type: DataTypes.STRING, allowNull: true },
  });

  const [fks] = await sequelize.query(
    `SELECT k.CONSTRAINT_NAME AS name, r.DELETE_RULE AS rule
       FROM information_schema.KEY_COLUMN_USAGE k
       JOIN information_schema.REFERENTIAL_CONSTRAINTS r
         ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
      WHERE k.TABLE_SCHEMA = DATABASE() AND k.TABLE_NAME = 'order_items'
        AND k.COLUMN_NAME = 'variationId' AND k.REFERENCED_TABLE_NAME = 'variations'`
  );
  const ok = fks.length === 1 && fks[0].rule === "SET NULL";
  if (!ok) {
    for (const fk of fks) await sequelize.query(`ALTER TABLE order_items DROP FOREIGN KEY \`${fk.name}\``);
    await sequelize.query("ALTER TABLE order_items MODIFY variationId INT NULL");
    await sequelize.query(
      `ALTER TABLE order_items ADD CONSTRAINT order_items_variationId_fk
         FOREIGN KEY (variationId) REFERENCES variations(id) ON DELETE SET NULL ON UPDATE CASCADE`
    );
  }

  await backfillSnapshot(sequelize);
}

export async function backfillSnapshot(sequelize) {
  await sequelize.query(
    `UPDATE order_items oi
       JOIN variations v ON v.id = oi.variationId
       JOIN products p ON p.id = v.productId
        SET oi.productName = COALESCE(oi.productName, p.name),
            oi.variationName = COALESCE(oi.variationName, v.name),
            oi.sku = COALESCE(oi.sku, v.sku)
      WHERE oi.productName IS NULL OR oi.variationName IS NULL OR oi.sku IS NULL`
  );
}
