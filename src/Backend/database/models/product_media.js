// Product photos, one row per file, keyed by variation id (renaming a SKU keeps its photos).
// `path` is relative to the images root, e.g. "product_images/12/34/56.webp".
export default (sequelize, DataTypes) => {
  const ProductMedia = sequelize.define(
    "ProductMedia",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      variationId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "variations", key: "id" }, onDelete: "CASCADE" },
      path: { type: DataTypes.STRING(500), allowNull: false },
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      alt: { type: DataTypes.STRING(200), allowNull: true },
    },
    { tableName: "product_media", timestamps: true, indexes: [{ fields: ["variationId", "position"] }] }
  );
  ProductMedia.associate = (models) => {
    ProductMedia.belongsTo(models.Variations, { foreignKey: "variationId", as: "variation" });
    models.Variations.hasMany(ProductMedia, { foreignKey: "variationId", as: "media" });
  };
  return ProductMedia;
};
