import { ValidationError } from "sequelize";
import { snakeCaseToNormalCase } from "../../utils.js";

// Sequelize model for the banner images table
export default (sequelize, DataTypes) => {
    const BannerImage = sequelize.define(
        "BannerImage", // Use PascalCase for the model name
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            directory: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "Directory must not be empty!" },
                },
            },
        },
        {
            sequelize,
            modelName: "BannerImage", // Use PascalCase for the model name
            tableName: "banner_image", // Use the correct table name here
        }
    );

    // beforeUpdate hook to validate unchanged fields
    BannerImage.beforeUpdate(async (banner, options) => {
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

        // Iterate over fields that are being updated
        for (const key of options.fields) {
            const oldValue = banner.previous(key); // Get the previous value
            const newValue = banner.getDataValue(key); // Get the new value

            // If the field hasn't changed, throw a validation error
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

    return BannerImage; // Return the model
};
