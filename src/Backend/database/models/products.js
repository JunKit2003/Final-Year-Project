

// Sequelize model for the products table
export default (sequelize, DataTypes) => {
  const Products = sequelize.define(
    "Products",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        unique: {
          args: true,
          msg: "Product ID must be unique!",
        },
      },
      category: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: "Category must not be empty!" },
        },
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: "Name must not be empty!" },
        },
      },
      brand: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: "Brand must not be empty!" },
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      // draft: only admins see it; live: on the shop; archived: hidden, kept for order history.
      status: {
        type: DataTypes.ENUM("draft", "live", "archived"),
        allowNull: false,
        defaultValue: "live",
      },
      featured: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      // [{ label, value }] shown as a table on the product page.
      specs: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
      // "Only N left" at or under this many units.
      lowStockThreshold: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3, validate: { min: 0 } },
      version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    },
    {
      sequelize,
      modelName: "Products",
      tableName: "products",
    }
  );

  Products.associate = (models) => {
    Products.hasMany(models.Variations, {
      foreignKey: "productId",
      as: "variations", // Alias for easier access
      onDelete: "CASCADE", // If a product is deleted, its variations will be deleted too
    });
  };

  // Every brand on a product has a brand_images row (logo, visibility, order), created
  // in the same transaction as the product so a rollback leaves nothing behind.
  const ensureBrand = async (product, options) => {
    const BrandImages = sequelize.models.BrandImages;
    if (!BrandImages || !product.brand) return;
    const existing = await BrandImages.findOne({ where: { brandName: product.brand }, transaction: options.transaction });
    if (!existing) {
      const max = (await BrandImages.max("position", { transaction: options.transaction })) || 0;
      await BrandImages.create({ brandName: product.brand, imagePath: "NoImage", isVisible: true, position: max + 1 }, { transaction: options.transaction });
    }
  };
  Products.afterCreate(ensureBrand);
  Products.afterUpdate(async (product, options) => {
    if (product.changed("brand")) await ensureBrand(product, options);
  });

  return Products;
};
