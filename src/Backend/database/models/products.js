import { ValidationError } from "sequelize";
import { snakeCaseToNormalCase } from "../../utils.js";
import path from 'path';


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

  // Add a hook to synchronize the brand_images table after a product is created
  Products.afterCreate(async (product, options) => {
    const { brand } = product;
    try {
      // Check if the BrandImages model is available in sequelize.models
      if (!sequelize.models.BrandImages) {
        console.error("BrandImages model is not available in sequelize.models.");
        return;
      }
  
      // Check if the brand already exists in the brand_images table
      const existingBrand = await sequelize.models.BrandImages.findOne({
        where: { brandName: brand },
      });
  
      // If it doesn't exist, add it
      if (!existingBrand) {
        await sequelize.models.BrandImages.create({
          brandName: brand,
          imagePath: "NoImage.jpg", // Default to an empty image path or placeholder
          isVisible: true, // Default visibility
        });
        console.log(`Added brand: ${brand} to brand_images table.`);
      } else {
        console.log(`Brand: ${brand} already exists in brand_images table.`);
      }
    } catch (error) {
      console.error("Error in Products.afterCreate hook:", error);
    }
  });
  

  return Products;
};
