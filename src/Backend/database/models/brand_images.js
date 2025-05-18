// Sequelize model for the BrandImages table

import { ValidationError } from "sequelize";
import { snakeCaseToNormalCase } from "../../utils.js";

export default (sequelize, DataTypes) => {
  const BrandImages = sequelize.define(
    "BrandImages",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        unique: {
          args: true,
          msg: "Brand Image ID must be unique!",
        },
      },
      brandName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: {
          args: true,
          msg: "Brand name must be unique!",
        },
        validate: {
          notEmpty: { msg: "Brand name must not be empty!" },
        },
      },
      imagePath: {
        type: DataTypes.STRING(500),
        allowNull: false,
        validate: {
          notEmpty: { msg: "Image path must not be empty!" },
        },
      },
      isVisible: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true, // Default to visible
        validate: {
          isIn: {
            args: [[true, false]],
            msg: "Visibility must be either true or false.",
          },
        },
      },
    },
    {
      sequelize,
      modelName: "BrandImages",
      tableName: "brand_images",
    }
  );

  // Hooks for validation or other logic
  BrandImages.beforeUpdate(async (brandImage, options) => {
    for (const key of options.fields) {
      const oldValue = brandImage.previous(key);
      const newValue = brandImage.getDataValue(key);

      // Check if the newValue is unchanged
      if (newValue === oldValue) {
        throw new ValidationError(`${key} is unchanged!`, [
          { message: `${snakeCaseToNormalCase(key)} is unchanged!` },
        ]);
      }
    }
  });

  return BrandImages;
};
