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
          model: "products", // Name of the products table
          key: "id",
        },
        onDelete: "CASCADE", // Ensures variations are removed if product is deleted
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
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Available", // Can be "Available" or "Out of stock"
        validate: {
          isIn: {
            args: [["Available", "Out of stock"]],
            msg: "Status must be 'Available' or 'Out of stock'.",
          },
        },
      },
    },
    {
      sequelize,
      modelName: "Variations",
      tableName: "variations",
    }
  );

  Variations.associate = (models) => {
    Variations.belongsTo(models.Products, {
      foreignKey: "productId",
      as: "product", // Alias for easier access
    });
  };

  return Variations;
};
