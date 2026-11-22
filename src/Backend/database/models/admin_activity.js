// Who changed what in the admin, newest first. Summaries only, no before/after diffs.
export default (sequelize, DataTypes) =>
  sequelize.define(
    "AdminActivity",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      actorId: { type: DataTypes.INTEGER, allowNull: true },
      actorName: { type: DataTypes.STRING, allowNull: true },
      action: { type: DataTypes.STRING(64), allowNull: false },
      entity: { type: DataTypes.STRING(64), allowNull: true },
      entityId: { type: DataTypes.STRING(64), allowNull: true },
      summary: { type: DataTypes.STRING(300), allowNull: false },
    },
    { tableName: "admin_activity", timestamps: true, updatedAt: false, indexes: [{ fields: ["createdAt"] }] }
  );
