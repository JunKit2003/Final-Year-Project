// Product status/featured/specs/threshold/version; variant sale price, order, archive, version.
// SKUs become unique across the shop when the data allows it.
import { DataTypes } from "sequelize";
import { addMissingColumns, hasIndex } from "../migrate.js";

export async function up({ qi, sequelize }) {
  await addMissingColumns(qi, "products", {
    status: { type: DataTypes.ENUM("draft", "live", "archived"), allowNull: false, defaultValue: "live" },
    featured: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    specs: { type: DataTypes.JSON, allowNull: true },
    lowStockThreshold: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3 },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  });
  await sequelize.query("UPDATE products SET specs = JSON_ARRAY() WHERE specs IS NULL");

  await addMissingColumns(qi, "variations", {
    compareAtPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    archivedAt: { type: DataTypes.DATE, allowNull: true },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  });
  await qi.changeColumn("variations", "image_folder_path", { type: DataTypes.STRING, allowNull: true });
  // Existing variants keep their order by id.
  await sequelize.query("UPDATE variations SET position = id WHERE position = 0");

  await addSkuIndexIfClean(qi, sequelize);
}

export async function addSkuIndexIfClean(qi, sequelize) {
  if (await hasIndex(qi, "variations", "variations_sku_unique")) return true;
  const [dups] = await sequelize.query("SELECT sku FROM variations GROUP BY sku HAVING COUNT(*) > 1");
  if (dups.length) {
    console.warn(`Duplicate SKUs: ${dups.map((d) => d.sku).join(", ")}. Not adding the unique SKU index until they're fixed.`);
    return false;
  }
  await qi.addIndex("variations", ["sku"], { unique: true, name: "variations_sku_unique" });
  return true;
}
