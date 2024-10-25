import { ValidationError } from "sequelize";
import { snakeCaseToNormalCase } from "../../utils.js";

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

  // You can keep or modify any existing hooks or methods here

  return Products;
};
