import { DataTypes } from "sequelize";
import { addMissingColumns } from "../migrate.js";

export async function up({ qi, sequelize }) {
  await addMissingColumns(qi, "banner_image", {
    position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    alt: { type: DataTypes.STRING(200), allowNull: true },
    linkUrl: { type: DataTypes.STRING(300), allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  });
  await addMissingColumns(qi, "brand_images", { position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 } });
  await sequelize.query("UPDATE banner_image SET position = id WHERE position = 0");
  await sequelize.query("UPDATE brand_images SET position = id WHERE position = 0");
}
