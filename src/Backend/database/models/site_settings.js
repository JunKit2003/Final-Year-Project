// One row per settings group (see src/shared/site-schema.js). A missing row means defaults.
export default (sequelize, DataTypes) =>
  sequelize.define(
    "SiteSetting",
    {
      key: { type: DataTypes.STRING(64), primaryKey: true },
      value: { type: DataTypes.JSON, allowNull: false },
      version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: "site_settings", timestamps: true }
  );
