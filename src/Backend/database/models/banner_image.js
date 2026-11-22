
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
            position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
            alt: { type: DataTypes.STRING(200), allowNull: true },
            linkUrl: { type: DataTypes.STRING(300), allowNull: true },
            isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        {
            sequelize,
            modelName: "BannerImage", // Use PascalCase for the model name
            tableName: "banner_image", // Use the correct table name here
        }
    );

    return BannerImage; // Return the model
};
