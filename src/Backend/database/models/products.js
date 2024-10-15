import { ValidationError } from "sequelize";
import { snakeCaseToNormalCase } from "../../utils.js";

// Sequelize model for the food items table
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
			price: {
				type: DataTypes.DECIMAL(10, 2),
				allowNull: false,
				validate: {
					notEmpty: { msg: "Price must not be empty!" },
					isDecimal: { msg: "Price must be a decimal number!" },
					min: 0,
				},
			},
			description: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			colors: {
				type: DataTypes.TEXT("long"),
				allowNull: true,
				get() {
					const rawValue = this.getDataValue("colors");
					return rawValue ? JSON.parse(rawValue) : [];
				},
				set(value) {
					if (!Array.isArray(value)) {
						throw new Error("Colors must be an array of strings!");
					}
					if (!value.every((c) => typeof c === "string")) {
						throw new Error("Each color must be a string!");
					}
					this.setDataValue("colors", JSON.stringify(value));
				},
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
				defaultValue: "Available", // Default value can be "Available" or "Out of Stock"
				validate: {
					notEmpty: { msg: "Status must not be empty!" },
					isIn: {
						args: [['Available', 'Out of stock']], // Define allowed values
						msg: "Status must be 'Available' or 'Out of stock'.",
					},
				},
			},
			
		},
		{
			sequelize,
			modelName: "Products",
			tableName: "products",
		}
	);

	// beforeUpdate hook to validate unchanged fields
	Products.beforeUpdate(async (product, options) => {
		if (options.hasImageChanges === "true") {
			return; // Skip the validation if hasImageChanges is true
		}

		if (!options.fields || options.fields.length === 0) {
			throw new ValidationError("No fields were updated.", [
				{
					message: "No fields were changed, update is invalid!",
				},
			]);
		}

		for (const key of options.fields) {
			const oldValue = product.previous(key);
			const newValue = product.getDataValue(key);

			if (newValue === oldValue) {
				throw new ValidationError(
					`${snakeCaseToNormalCase(key)} is unchanged!`,
					[
						{
							message: `${snakeCaseToNormalCase(key)} is unchanged!`,
						},
					]
				);
			}
		}
	});

	return Products;
};
