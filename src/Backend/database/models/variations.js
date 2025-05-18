export default (sequelize, DataTypes) => {
  const Variations = sequelize.define(
    "Variations",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        unique: true,
      },
      productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "products",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: "Name must not be empty!" },
        },
      },
      sku: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: "SKU must not be empty!" },
        },
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          isDecimal: { msg: "Price must be a decimal number!" },
          min: 0,
        },
      },
      stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 0,
          isInt: { msg: "Stock must be an integer!" },
        },
      },
      intendedUse: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      image_folder_path: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: "Image folder path must not be empty!" },
        },
      },
    },
    {
      sequelize,
      modelName: "Variations",
      tableName: "variations",
    }
  );

  // Hook to update status based on stock
  Variations.addHook("beforeValidate", (variation) => {
    if (variation.stock === 0) {
      variation.status = "Out of stock";
    } else if (variation.stock > 0) {
      variation.status = "Available";
    }
  });

  Variations.associate = (models) => {
    Variations.belongsTo(models.Products, {
      foreignKey: "productId",
      as: "product",
    });
  };

  return Variations;
};
