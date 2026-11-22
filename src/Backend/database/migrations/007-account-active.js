import { DataTypes } from "sequelize";
import { addMissingColumns } from "../migrate.js";

export async function up({ qi }) {
  await addMissingColumns(qi, "account", { isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true } });
}
